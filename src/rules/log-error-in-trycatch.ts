import { createRule } from '../utils/createRule';
import { createLoggerCallTracker, createCallExpression } from '../utils/loggerCallTracker';

// TODO: add option to specify custom loggers
const loggers = ['console.error', 'console.warn', 'Sentry.captureException'] as const;

export const logErrorInTrycatch = createRule({
    meta: {
        type: 'problem',
        docs: {
            category: 'Best Practices',
            description: 'Suggest logging an error in every branch inside a catch block',
            recommended: true,
            // todo: add url
            // url: ''
        },
        messages: {
            'error-not-handled':
                'In the catch block, you should either re-throw the original error, throw a new error, or log the error.',
        },
        schema: [],
    },
    create(context) {
        const tracker = createLoggerCallTracker(node => {
            context.report({
                node,
                messageId: 'error-not-handled',
            });
        });

        return {
            CatchClause: node => {
                tracker.onScopeEnter(node);
                tracker.setFunctionBoundary(node);
            },
            'CatchClause:exit': tracker.onScopeExit,
            'CatchClause BlockStatement': tracker.onBlockScopeEnter,
            'CatchClause BlockStatement:exit': tracker.onBlockScopeExit,
            'CatchClause ReturnStatement': tracker.onReturnStatement,
            'CatchClause > BlockStatement > ThrowStatement': tracker.onErrorProccessingInRoot,
            'CatchClause BlockStatement ThrowStatement': tracker.onErrorProccessingInBlock,

            ...loggers.reduce((acc, logger) => {
                Object.assign(acc, {
                    [`CatchClause > BlockStatement > ExpressionStatement > ${createCallExpression(logger)}`]:
                        tracker.onErrorProccessingInRoot,
                    [`CatchClause BlockStatement ${createCallExpression(logger)}`]: tracker.onErrorProccessingInBlock,
                });
                return acc;
            }, {}),
        };
    },
});
