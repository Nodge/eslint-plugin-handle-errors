import { Rule } from 'eslint';
import type { BlockStatement, ReturnStatement, ThrowStatement } from 'estree';

interface ScopeStackEntry {
    isErrorHandled: boolean;
    hasUnhandledReturn: boolean;
    node: Rule.Node;
    functionBoundary?: Rule.Node;
}

interface BlockStackEntry {
    isErrorHandled: boolean;
}

type Reporter = (node: Rule.Node) => void;

export function createLoggerCallTracker(report: Reporter) {
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
            report(node);
        }
    };

    const setFunctionBoundary = (node: Rule.Node) => {
        const lastScope = scopesStack.at(-1);
        if (!lastScope) {
            throw new Error('no active scope');
        }

        lastScope.functionBoundary = node;
    };

    const isInsideInnerFunction = (node: Rule.Node) => {
        const lastScope = scopesStack.at(-1);

        let parent = node.parent;
        while (parent) {
            if (parent === lastScope?.node || parent === lastScope?.functionBoundary) {
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

    const onBlockScopeEnter = (node: BlockStatement & Rule.NodeParentExtension) => {
        if (isInsideInnerFunction(node)) return;

        blocksStack.push({
            isErrorHandled: false,
        });
    };

    const onBlockScopeExit = (node: BlockStatement & Rule.NodeParentExtension) => {
        if (isInsideInnerFunction(node)) return;

        blocksStack.pop();
    };

    const onReturnStatement = (node: ReturnStatement & Rule.NodeParentExtension) => {
        const lastScope = scopesStack.at(-1);

        if (!blocksStack.length || isInsideInnerFunction(node) || !lastScope || lastScope.isErrorHandled) {
            return;
        }

        if (!blocksStack.at(-1)?.isErrorHandled) {
            lastScope.hasUnhandledReturn = true;
        }
    };

    const onErrorProccessingInRoot = () => {
        const lastScope = scopesStack.at(-1);
        if (!lastScope) return;
        lastScope.isErrorHandled = true;
    };

    const onErrorProccessingInBlock = (node: ThrowStatement & Rule.NodeParentExtension) => {
        const lastBlock = blocksStack.at(-1);
        if (!lastBlock || isInsideInnerFunction(node)) return;
        lastBlock.isErrorHandled = true;
    };

    return {
        onScopeEnter,
        onScopeExit,
        setFunctionBoundary,
        onBlockScopeEnter,
        onBlockScopeExit,
        onReturnStatement,
        onErrorProccessingInRoot,
        onErrorProccessingInBlock,
    };
}
