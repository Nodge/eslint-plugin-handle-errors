import { createRule } from '../utils/create-rule';
import { createLoggerCallTracker } from '../utils/logger-call-tracker';
import { parseSettings } from '../utils/settings';

export const logErrorInTrycatch = createRule({
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce error logging in try/catch blocks',
            recommended: true,
            url: 'https://github.com/nodge/eslint-plugin-handle-errors/blob/main/docs/rules/log-error-in-trycatch.md',
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

        return {
            ...tracker.codePathListeners,
            Program: node => {
                for (const value of settings.invalidLoggerFunctions) {
                    context.report({ node, messageId: 'invalid-logger-function', data: { value } });
                }
            },
            CatchClause: tracker.onScopeEnter,
            'CatchClause:exit': tracker.onScopeExit,
            'CatchClause ThrowStatement': tracker.onThrowStatement,
            'CatchClause CallExpression > .callee': tracker.assertLoggerReference,
        };
    },
});
