import type { Rule, Scope } from 'eslint';
import type { Identifier, MemberExpression, Node } from 'estree';
import { Settings } from './settings';

type ParameterDefinition = Extract<Scope.Definition, { type: 'Parameter' }>;

/**
 * Nodes typescript-eslint puts between an expression and its parent, as in `fn satisfies Executor`.
 * They are absent from the estree types, so they are matched by name.
 */
const typeAnnotationWrappers = new Set([
    'TSAsExpression',
    'TSSatisfiesExpression',
    'TSNonNullExpression',
    'TSInstantiationExpression',
]);

/** A region of code that has to handle the error on every path leaving it */
interface HandlingScope {
    /** Node the scope is entered and exited on */
    node: Rule.Node;
    /** Node the violation is reported on */
    reportNode: Rule.Node;
    /** Code path the scope belongs to */
    codePath: Rule.CodePath;
    /** Segments the scope is entered through */
    entrySegments: readonly Rule.CodePathSegment[];
    /** Segments of that code path that lie inside the scope */
    segments: Set<Rule.CodePathSegment>;
    /** Segments where control flow can leave the scope on its own, rather than by an exception */
    exitSegments: Set<Rule.CodePathSegment>;
}

interface CodePathState {
    codePath: Rule.CodePath;
    /** Segments currently being traversed */
    currentSegments: Set<Rule.CodePathSegment>;
    /** Scopes of this code path, checked once its segment graph is complete */
    scopes: HandlingScope[];
}

interface TrackerParams {
    /** Parsed plugin settings */
    settings: Settings;
    /** ESLint plugin execution context */
    context: Rule.RuleContext;
    /** Message ID for error reporing */
    messageId: string;
}

export function createLoggerCallTracker({ settings, context, messageId }: TrackerParams) {
    const codePathStack: CodePathState[] = [];
    const activeScopes: HandlingScope[] = [];
    const handledSegments = new Set<Rule.CodePathSegment>();

    const getCurrentCodePath = () => codePathStack.at(-1);

    const onCodePathStart = (codePath: Rule.CodePath) => {
        codePathStack.push({ codePath, currentSegments: new Set(), scopes: [] });
    };

    const onCodePathEnd = () => {
        const state = codePathStack.pop();
        if (!state) return;

        for (const scope of state.scopes) {
            reportUnhandledScope(scope);
        }
    };

    const onSegmentStart = (segment: Rule.CodePathSegment) => {
        const state = getCurrentCodePath();
        if (!state) return;

        state.currentSegments.add(segment);

        for (const scope of activeScopes) {
            // Segments of a nested function belong to its own code path, not to the scope around it
            if (scope.codePath === state.codePath) {
                scope.segments.add(segment);
            }
        }
    };

    const onSegmentEnd = (segment: Rule.CodePathSegment) => {
        getCurrentCodePath()?.currentSegments.delete(segment);
    };

    /** Code path listeners the tracker relies on. Spread into the rule visitor as is. */
    const codePathListeners: Rule.RuleListener = {
        onCodePathStart,
        onCodePathEnd,
        onCodePathSegmentStart: onSegmentStart,
        onUnreachableCodePathSegmentStart: onSegmentStart,
        onCodePathSegmentEnd: onSegmentEnd,
        onUnreachableCodePathSegmentEnd: onSegmentEnd,
    };

    const onScopeEnter = (node: Rule.Node, reportNode: Rule.Node = node) => {
        const state = getCurrentCodePath();
        if (!state) return;

        const scope: HandlingScope = {
            node,
            reportNode,
            codePath: state.codePath,
            // The scope starts inside the segments that are already open when its root node is visited
            entrySegments: [...state.currentSegments],
            segments: new Set(state.currentSegments),
            exitSegments: new Set(),
        };

        activeScopes.push(scope);
        state.scopes.push(scope);
    };

    const onScopeExit = (node: Rule.Node) => {
        const scope = activeScopes.at(-1);
        if (scope?.node !== node) return;

        const state = getCurrentCodePath();
        if (state?.codePath === scope.codePath) {
            // Whatever is still open when the scope ends is where the block is left by running off its end
            addExitSegments(scope, state);
        }

        activeScopes.pop();
    };

    /**
     * Records the segments being traversed as a place control flow leaves the scope on its own.
     * Only such segments are looked at as exits: an edge into an enclosing `catch` or `finally` means
     * an exception is unwinding, which replaces the error being handled rather than dropping it.
     */
    const onScopeExitStatement = () => {
        const state = getCurrentCodePath();
        if (!state) return;

        // A `return` inside a nested handler leaves the handler around it as well
        for (const scope of activeScopes) {
            if (scope.codePath === state.codePath) {
                addExitSegments(scope, state);
            }
        }
    };

    const addExitSegments = (scope: HandlingScope, state: CodePathState) => {
        for (const segment of state.currentSegments) {
            scope.exitSegments.add(segment);
        }
    };

    /** Reports the scope unless the error is handled on every code path leaving it */
    const reportUnhandledScope = (scope: HandlingScope) => {
        const isInScope = (segment: Rule.CodePathSegment) => scope.segments.has(segment);

        // A `return` crossing a `finally` leaves the function downstream of the statement itself
        const returnedSegments = new Set(scope.codePath.returnedSegments);

        /** Does control flow leave the scope at the end of the segment */
        const leavesScope = (segment: Rule.CodePathSegment): boolean => {
            if (returnedSegments.has(segment)) return true;
            if (!scope.exitSegments.has(segment)) return false;
            // No successors at all means a return, a throw or the end of the enclosing function
            if (segment.nextSegments.length === 0) return true;

            return segment.nextSegments.some(next => !isInScope(next));
        };

        /** Segments the error can reach from the scope entry without being handled on the way */
        const unhandled = new Set<Rule.CodePathSegment>();
        const queue: Rule.CodePathSegment[] = [];

        const enqueue = (segment: Rule.CodePathSegment) => {
            if (!segment.reachable) return;
            if (handledSegments.has(segment)) return;
            if (unhandled.has(segment)) return;

            unhandled.add(segment);
            queue.push(segment);
        };

        for (const segment of scope.entrySegments) {
            enqueue(segment);
        }

        for (let index = 0; index < queue.length; index++) {
            const segment = queue[index];
            if (!segment) continue;

            if (leavesScope(segment)) {
                context.report({ node: scope.reportNode, messageId });
                return;
            }

            for (const next of segment.nextSegments) {
                if (isInScope(next)) enqueue(next);
            }
        }

        // Nothing leaves the scope unhandled, but a path can still be stuck inside it, as in `while (true)`.
        // A path is fine while it can still reach a segment that handles the error or leaves the scope.
        const settled = new Set<Rule.CodePathSegment>();
        const stack: Rule.CodePathSegment[] = [];

        const settle = (segment: Rule.CodePathSegment) => {
            if (settled.has(segment)) return;

            settled.add(segment);
            stack.push(segment);
        };

        for (const segment of unhandled) {
            const leadsOn =
                // Nothing unhandled follows, so the path ends here rather than circling inside the scope
                segment.nextSegments.every(next => !unhandled.has(next)) ||
                // A way on inside the scope: an edge out of it would be an exception unwinding
                segment.nextSegments.some(next => next.reachable && isInScope(next) && !unhandled.has(next));

            if (leadsOn) settle(segment);
        }

        for (let index = 0; index < stack.length; index++) {
            const segment = stack[index];
            if (!segment) continue;

            for (const prev of segment.prevSegments) {
                if (unhandled.has(prev)) settle(prev);
            }
        }

        if (settled.size < unhandled.size) {
            context.report({ node: scope.reportNode, messageId });
        }
    };

    const markCodePathAsHandled = () => {
        const state = getCurrentCodePath();
        if (!state) return;

        for (const segment of state.currentSegments) {
            if (segment.reachable) {
                handledSegments.add(segment);
            }
        }
    };

    const assertLoggerReference = (node: Rule.Node) => {
        if (isLoggerReference(node)) {
            markCodePathAsHandled();
        }
    };

    const isLoggerReference = (node: Rule.Node): boolean => {
        switch (node.type) {
            case 'Identifier':
                return isSupportedLogger(node) || isPromiseReject(node);
            case 'MemberExpression':
                return isSupportedLogger(node);
            default:
                return false;
        }
    };

    const isSupportedLogger = (node: Identifier | MemberExpression): boolean => {
        const path = getMemberPath(node);
        if (!path) return false;

        return settings.loggerFunctions.some(
            logger =>
                logger.path.length === path.length && logger.path.every((segment, index) => segment === path[index])
        );
    };

    /** Flattens a member chain into its segments, or returns null for a shape that cannot be configured */
    const getMemberPath = (node: Node): string[] | null => {
        switch (node.type) {
            case 'Identifier':
                return [node.name];
            case 'ThisExpression':
                return ['this'];
            case 'Super':
                return ['super'];
            case 'MetaProperty':
                return [node.meta.name, node.property.name];
            case 'MemberExpression': {
                if (node.computed || node.property.type !== 'Identifier') return null;

                const objectPath = getMemberPath(node.object);
                return objectPath && [...objectPath, node.property.name];
            }
            default:
                return null;
        }
    };

    /**
     * Follows the writes that can put the `reject` parameter of a promise executor into a variable,
     * such as `const renamed = reject`. Which write is live at the call is beyond what the rule tracks,
     * so every write to the variable counts, wherever in the module it stands: `var renamed = noop;
     * var renamed = reject` is accepted, a later `renamed = noop` goes unnoticed, and so does a write
     * made from another function, as in `new Promise((resolve, reject) => { handle = reject })`.
     * Of the two directions, accepting is the one that keeps quiet on code that does hand the error over.
     */
    const isPromiseReject = (node: Identifier): boolean => {
        // `var x = x` is legal, and so is a longer cycle of aliases: walk iteratively and never twice
        const visited = new Set<Scope.Variable>();
        const aliases: Identifier[] = [node];

        for (let index = 0; index < aliases.length; index++) {
            const identifier = aliases[index];
            if (!identifier) continue;

            const scope = context.sourceCode.getScope(identifier);
            const variable = scope.references.find(reference => reference.identifier === identifier)?.resolved;
            if (!variable || visited.has(variable)) continue;
            visited.add(variable);

            if (variable.defs.some(isRejectParameter)) {
                return true;
            }

            for (const reference of variable.references) {
                if (reference.writeExpr?.type === 'Identifier') {
                    aliases.push(reference.writeExpr);
                }
            }
        }

        return false;
    };

    const isRejectParameter = (definition: Scope.Definition): boolean => {
        if (definition.type !== 'Parameter') return false;

        return getParamIndex(definition) === 1 && isPromiseExecutor(definition.node as Rule.Node);
    };

    /** Is the function the executor of a `new Promise(...)`, rather than any function nested in one */
    const isPromiseExecutor = (node: Rule.Node): boolean => {
        let executor: Rule.Node = node;
        while (executor.parent && typeAnnotationWrappers.has(executor.parent.type)) {
            executor = executor.parent;
        }

        const parent = executor.parent;

        return (
            parent?.type === 'NewExpression' &&
            parent.arguments[0] === executor &&
            parent.callee.type === 'Identifier' &&
            parent.callee.name === 'Promise'
        );
    };

    /** Index of the parameter the definition names. A default value wraps it in an `AssignmentPattern`. */
    const getParamIndex = (definition: ParameterDefinition): number => {
        return definition.node.params.findIndex(
            param => param === definition.name || (param.type === 'AssignmentPattern' && param.left === definition.name)
        );
    };

    return {
        codePathListeners,
        onScopeEnter,
        onScopeExit,
        onScopeExitStatement,
        onThrowStatement: markCodePathAsHandled,
        assertLoggerReference,
        isLoggerReference,
    };
}
