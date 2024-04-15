import { createRule } from '../utils/createRule';
import { createLoggerCallTracker, createCallExpression, createMemberExpression } from '../utils/loggerCallTracker';
import { parseSettings } from '../utils/settings';

export const logErrorInPromises = createRule({
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
        const settings = parseSettings(context.settings);
        const tracker = createLoggerCallTracker(settings, node =>
            context.report({
                node,
                messageId: 'error-not-handled',
            })
        );

        const catchCall = 'CallExpression[callee.property.name="catch"]';

        return {
            [`${catchCall}`]: tracker.onScopeEnter,
            [`${catchCall}:exit`]: tracker.onScopeExit,
            [`${catchCall} > :function`]: tracker.setFunctionBoundary,
            [`${catchCall}[arguments.length=1] > :function BlockStatement`]: tracker.onBlockScopeEnter,
            [`${catchCall}[arguments.length=1] > :function BlockStatement:exit`]: tracker.onBlockScopeExit,
            [`${catchCall}[arguments.length=1] > :function ReturnStatement`]: tracker.onReturnStatement,
            [`${catchCall}[arguments.length=1] > :function > BlockStatement > ThrowStatement`]:
                tracker.onErrorProccessingInRoot,
            [`${catchCall}[arguments.length=1] > :function BlockStatement ThrowStatement`]:
                tracker.onErrorProccessingInBlock,

            ...settings.loggerFunctions.reduce((acc, logger) => {
                Object.assign(acc, {
                    [`CallExpression[callee.property.name="catch"][arguments.length=1] > :function > BlockStatement > ExpressionStatement > ${createCallExpression(logger)}`]:
                        tracker.onErrorProccessingInRoot,
                    [`CallExpression[callee.property.name="catch"][arguments.length=1] > :function BlockStatement ${createCallExpression(logger)}`]:
                        tracker.onErrorProccessingInBlock,

                    [`CallExpression[callee.property.name="catch"][arguments.length=1] > ArrowFunctionExpression > ${createCallExpression(logger)}`]:
                        tracker.onErrorProccessingInRoot,
                    [`CallExpression[callee.property.name="catch"][arguments.length=1] > ArrowFunctionExpression BlockStatement ${createCallExpression(logger)}`]:
                        tracker.onErrorProccessingInBlock,

                    [`CallExpression[callee.property.name="catch"][arguments.length=1] > ${createMemberExpression(logger)}`]:
                        tracker.onErrorProccessingInRoot,
                });
                return acc;
            }, {}),
        };
    },
});
