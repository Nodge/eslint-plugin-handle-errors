import type { Rule } from 'eslint';
import type {
    ArrowFunctionExpression,
    CallExpression,
    FunctionExpression,
    Identifier,
    MemberExpression,
    Node,
} from 'estree';
import { createRule } from '../utils/create-rule';
import { createLoggerCallTracker } from '../utils/logger-call-tracker';
import { parseSettings } from '../utils/settings';

type FunctionNode = ArrowFunctionExpression | FunctionExpression;

export const logErrorInPromises = createRule({
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce error logging in promise .catch() handlers',
            recommended: true,
            url: 'https://github.com/nodge/eslint-plugin-handle-errors/blob/main/docs/rules/log-error-in-promises.md',
        },
        messages: {
            'error-not-handled':
                'In the catch block, you should either re-throw the original error, throw a new error, or log the error.',
            'invalid-logger-function':
                "Invalid entry in settings.handleErrors.loggerFunctions: '{{value}}'. Expected a function name or a member chain, such as 'reportError', 'logger.error' or 'this.logger.error'.",
        },
        schema: [],
    },
    create(context) {
        const settings = parseSettings(context.settings);
        const tracker = createLoggerCallTracker({
            settings,
            context,
            messageId: 'error-not-handled',
        });

        const catchCall = 'CallExpression[callee.property.name="catch"]';
        const catchCallWithArg = `${catchCall}[arguments.length=1]`;

        /** Catch calls whose handler is a plain reference to a logger, such as `.catch(console.error)` */
        const handledCatchCalls = new WeakSet<Node>();

        return {
            ...tracker.codePathListeners,
            Program: node => {
                for (const value of settings.invalidLoggerFunctions) {
                    context.report({ node, messageId: 'invalid-logger-function', data: { value } });
                }
            },
            // The handler body is a code path of its own, so the scope is opened on the handler, not on the call
            [`${catchCallWithArg} > :function`]: (node: FunctionNode & Rule.NodeParentExtension) =>
                tracker.onScopeEnter(node, node.parent),
            [`${catchCallWithArg} > :function:exit`]: tracker.onScopeExit,
            [`${catchCallWithArg} > :function ThrowStatement`]: tracker.onThrowStatement,
            [`${catchCallWithArg} > :function :matches(ReturnStatement, BreakStatement, ContinueStatement)`]:
                tracker.onScopeExitStatement,
            [`${catchCallWithArg} > :function CallExpression > .callee`]: tracker.assertLoggerReference,
            [`${catchCallWithArg} > .arguments:matches(Identifier, MemberExpression)`]: (
                node: (Identifier | MemberExpression) & Rule.NodeParentExtension
            ) => {
                if (tracker.isLoggerReference(node)) {
                    handledCatchCalls.add(node.parent);
                }
            },
            [`${catchCall}:exit`]: (node: CallExpression & Rule.NodeParentExtension) => {
                if (hasFunctionHandler(node) || handledCatchCalls.has(node)) return;

                context.report({ node, messageId: 'error-not-handled' });
            },
        };
    },
});

/** Is the error passed to a handler declared in place, such as `.catch(e => { ... })` */
function hasFunctionHandler(node: CallExpression): boolean {
    if (node.arguments.length !== 1) return false;

    const handler = node.arguments[0];
    return handler?.type === 'ArrowFunctionExpression' || handler?.type === 'FunctionExpression';
}
