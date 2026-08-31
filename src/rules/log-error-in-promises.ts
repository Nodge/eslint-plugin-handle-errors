import { createRule } from '../utils/create-rule';
import { createLoggerCallTracker } from '../utils/logger-call-tracker';
import { parseSettings } from '../utils/settings';

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

        return {
            Program: node => {
                for (const value of settings.invalidLoggerFunctions) {
                    context.report({ node, messageId: 'invalid-logger-function', data: { value } });
                }
            },
            [`${catchCall}`]: tracker.onScopeEnter,
            [`${catchCall}:exit`]: tracker.onScopeExit,
            [`${catchCall} > :function`]: tracker.setScopeBoundary,
            [`${catchCallWithArg} > :function BlockStatement`]: tracker.onBlockScopeEnter,
            [`${catchCallWithArg} > :function BlockStatement:exit`]: tracker.onBlockScopeExit,
            [`${catchCallWithArg} > :function ReturnStatement`]: tracker.onReturnStatement,
            [`${catchCallWithArg} > :function ThrowStatement`]: tracker.onThrowStatement,
            [`${catchCallWithArg} > :function CallExpression > .callee`]: tracker.assertLoggerReference,
            [`${catchCallWithArg} > .arguments:matches(Identifier, MemberExpression)`]: tracker.assertLoggerReference,
        };
    },
});
