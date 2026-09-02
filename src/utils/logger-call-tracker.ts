import type { Rule, Scope } from 'eslint';
import type { Identifier, MemberExpression, NewExpression, Node } from 'estree';
import { Settings } from './settings';

type ParameterDefinition = Extract<Scope.Definition, { type: 'Parameter' }>;

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
        };

        activeScopes.push(scope);
        state.scopes.push(scope);
    };

    const onScopeExit = (node: Rule.Node) => {
        if (activeScopes.at(-1)?.node === node) {
            activeScopes.pop();
        }
    };

    /** Reports the scope unless the error is handled on every code path leaving it */
    const reportUnhandledScope = (scope: HandlingScope) => {
        const isInScope = (segment: Rule.CodePathSegment) => scope.segments.has(segment);

        /** Does control flow leave the scope at the end of the segment */
        const leavesScope = (segment: Rule.CodePathSegment): boolean => {
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
        for (const segment of scope.segments) {
            // Everything before such a segment lies outside the scope, so it is an entry of its own
            if (segment.prevSegments.every(prev => !isInScope(prev))) {
                enqueue(segment);
            }
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
        // Such a path is fine only while every way on from it ends up handling the error.
        const openSuccessors = new Map<Rule.CodePathSegment, number>();
        const settled: Rule.CodePathSegment[] = [];

        for (const segment of unhandled) {
            const open = segment.nextSegments.filter(next => unhandled.has(next)).length;
            openSuccessors.set(segment, open);
            if (open === 0) settled.push(segment);
        }

        for (let index = 0; index < settled.length; index++) {
            const segment = settled[index];
            if (!segment) continue;

            for (const prev of segment.prevSegments) {
                const open = openSuccessors.get(prev);
                if (open === undefined || open === 0) continue;

                openSuccessors.set(prev, open - 1);
                if (open === 1) settled.push(prev);
            }
        }

        if ([...openSuccessors.values()].some(open => open > 0)) {
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

    /** Follows a chain of aliases, such as `const renamed = reject`, down to its declaration */
    const isPromiseReject = (node: Identifier): boolean => {
        // `var x = x` is legal, and so is a longer cycle of aliases: walk iteratively and never twice
        const visited = new Set<Scope.Variable>();
        let identifier = node;

        for (;;) {
            const scope = context.sourceCode.getScope(identifier);
            const variable = scope.references.find(reference => reference.identifier === identifier)?.resolved;
            if (!variable || visited.has(variable)) {
                return false;
            }
            visited.add(variable);

            const definition = variable.defs[0];
            if (!definition) {
                return false;
            }

            switch (definition.type) {
                case 'Parameter':
                    return getParamIndex(definition) === 1 && isPromiseDeclaration(definition.node as Rule.Node);
                case 'Variable': {
                    const alias = definition.node.init;
                    if (alias?.type !== 'Identifier') {
                        return false;
                    }
                    identifier = alias;
                    break;
                }
                default:
                    return false;
            }
        }
    };

    const isPromiseDeclaration = (node: Rule.Node): boolean => {
        let newExpression: NewExpression | null = null;

        let parent: Rule.Node | null = node;
        while (parent) {
            if (parent.type === 'NewExpression') {
                newExpression = parent;
                break;
            }
            parent = parent.parent;
        }

        if (!newExpression) {
            return false;
        }

        if (newExpression.callee.type !== 'Identifier') {
            return false;
        }

        if (newExpression.callee.name !== 'Promise') {
            return false;
        }

        return true;
    };

    const getParamIndex = (definition: ParameterDefinition): number => {
        return definition.node.params.indexOf(definition.name);
    };

    return {
        codePathListeners,
        onScopeEnter,
        onScopeExit,
        onThrowStatement: markCodePathAsHandled,
        assertLoggerReference,
        isLoggerReference,
    };
}
