import type { Rule, Scope } from 'eslint';
import type {
    BlockStatement,
    ReturnStatement,
    ThrowStatement,
    MemberExpression,
    Identifier,
    NewExpression,
    Node,
} from 'estree';
import { Settings } from './settings';

type ParameterDefinition = Extract<Scope.Definition, { type: 'Parameter' }>;

interface ScopeStackEntry {
    /** Is there an error logger call in the scope */
    isErrorHandled: boolean;
    /** Has the scope code paths without error logger calls */
    hasUnhandledReturn: boolean;
    /** Root node of the scope */
    node: Rule.Node;
    /** Root block node of the scope */
    boundaryNode?: Rule.Node;
}

interface BlockStackEntry {
    /** Is there an error logger call in the block */
    isErrorHandled: boolean;
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
    const scopesStack: ScopeStackEntry[] = [];
    const blocksStack: BlockStackEntry[] = [];

    const onScopeEnter = (node: Rule.Node) => {
        scopesStack.push({
            node,
            isErrorHandled: false,
            hasUnhandledReturn: false,
        });
    };

    const onScopeExit = (node: Rule.Node) => {
        const scopeInfo = scopesStack.pop();
        if (!scopeInfo) {
            throw new Error('scopeInfo is undefined');
        }

        if (!scopeInfo.isErrorHandled || scopeInfo.hasUnhandledReturn) {
            context.report({ node, messageId });
        }
    };

    const setScopeBoundary = (node: Rule.Node) => {
        const lastScope = scopesStack.at(-1);
        if (!lastScope) {
            throw new Error('no active scope');
        }

        lastScope.boundaryNode = node;
    };

    const isInsideInnerFunction = (node: Rule.Node) => {
        const lastScope = scopesStack.at(-1);

        let parent = node.parent;
        while (parent) {
            if (parent === lastScope?.node || parent === lastScope?.boundaryNode) {
                return false;
            }

            if (
                parent.type === 'ArrowFunctionExpression' ||
                parent.type === 'FunctionDeclaration' ||
                parent.type === 'FunctionExpression'
            ) {
                return true;
            }

            parent = parent.parent;
        }
        return false;
    };

    const isBoundaryFunctionBlockScope = (node: BlockStatement & Rule.NodeParentExtension) => {
        const lastScope = scopesStack.at(-1);
        if (!lastScope) return;

        const parent = node.parent;
        if (!parent) return;

        return parent === lastScope?.boundaryNode;
    };

    const markCodePathAsHandled = () => {
        const isInsideBlock = blocksStack.length > 0;
        const stack = isInsideBlock ? blocksStack : scopesStack;
        const stackItem = stack.at(-1);
        if (!stackItem) return;
        stackItem.isErrorHandled = true;
    };

    const onBlockScopeEnter = (node: BlockStatement & Rule.NodeParentExtension) => {
        if (isBoundaryFunctionBlockScope(node)) return;
        if (isInsideInnerFunction(node)) return;

        blocksStack.push({
            isErrorHandled: false,
        });
    };

    const onBlockScopeExit = (node: BlockStatement & Rule.NodeParentExtension) => {
        if (isBoundaryFunctionBlockScope(node)) return;
        if (isInsideInnerFunction(node)) return;

        blocksStack.pop();
    };

    const onReturnStatement = (node: ReturnStatement & Rule.NodeParentExtension) => {
        if (isInsideInnerFunction(node)) return;

        const lastScope = scopesStack.at(-1);
        if (!lastScope) return;

        if (lastScope.isErrorHandled) return;

        const currentBlock = blocksStack.at(-1);
        if (currentBlock) {
            if (!currentBlock.isErrorHandled) {
                lastScope.hasUnhandledReturn = true;
            }
            return;
        }

        if (!lastScope.isErrorHandled) {
            lastScope.hasUnhandledReturn = true;
        }
    };

    const onThrowStatement = (node: ThrowStatement & Rule.NodeParentExtension) => {
        if (isInsideInnerFunction(node)) return;

        markCodePathAsHandled();
    };

    const assertLoggerReference = (node: Rule.Node) => {
        if (isInsideInnerFunction(node)) return;

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

    const isPromiseReject = (node: Identifier): boolean => {
        const scope = context.sourceCode.getScope(node);
        const variable = scope.references.find(variable => variable.identifier === node)?.resolved;
        const definition = variable?.defs[0];
        if (!definition) {
            return false;
        }

        switch (definition.type) {
            case 'Parameter':
                return getParamIndex(definition) === 1 && isPromiseDeclaration(definition.node as Rule.Node);
            case 'Variable':
                if (definition.node.init?.type === 'Identifier') {
                    return isPromiseReject(definition.node.init);
                }
                return false;
            default:
                return false;
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
        onScopeEnter,
        onScopeExit,
        setScopeBoundary,
        onBlockScopeEnter,
        onBlockScopeExit,
        onReturnStatement,
        onThrowStatement,
        assertLoggerReference,
    };
}
