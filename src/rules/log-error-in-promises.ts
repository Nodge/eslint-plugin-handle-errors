import { Rule } from 'eslint';
import { createCallExpression, createMemberExpression } from '../utils/ast-helpers';
import { createRule } from '../utils/create-rule';
import { createLoggerCallTracker } from '../utils/logger-call-tracker';
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
        const tracker = createLoggerCallTracker(node =>
            context.report({
                node,
                messageId: 'error-not-handled',
            })
        );

        const catchCall = 'CallExpression[callee.property.name="catch"]';
        const catchCallWithArg = `${catchCall}[arguments.length=1]`;

        const visitor: Rule.RuleListener = {
            [`${catchCall}`]: tracker.onScopeEnter,
            [`${catchCall}:exit`]: tracker.onScopeExit,
            [`${catchCall} > :function`]: tracker.setFunctionBoundary,
            [`${catchCallWithArg} > :function BlockStatement`]: tracker.onBlockScopeEnter,
            [`${catchCallWithArg} > :function BlockStatement:exit`]: tracker.onBlockScopeExit,
            [`${catchCallWithArg} > :function ReturnStatement`]: tracker.onReturnStatement,
            [`${catchCallWithArg} > :function > BlockStatement > ThrowStatement`]: tracker.onErrorProccessingInRoot,
            [`${catchCallWithArg} > :function BlockStatement ThrowStatement`]: tracker.onErrorProccessingInBlock,
        };

        for (const logger of settings.loggerFunctions) {
            Object.assign(visitor, {
                [`${catchCallWithArg} > :function > BlockStatement > ExpressionStatement > ${createCallExpression(logger)}`]:
                    tracker.onErrorProccessingInRoot,
                [`${catchCallWithArg} > :function BlockStatement ${createCallExpression(logger)}`]:
                    tracker.onErrorProccessingInBlock,

                [`${catchCallWithArg} > ArrowFunctionExpression > ${createCallExpression(logger)}`]:
                    tracker.onErrorProccessingInRoot,
                [`${catchCallWithArg} > ArrowFunctionExpression BlockStatement ${createCallExpression(logger)}`]:
                    tracker.onErrorProccessingInBlock,

                [`${catchCallWithArg} > ${createMemberExpression(logger)}`]: tracker.onErrorProccessingInRoot,
            });
        }

        return visitor;
    },
});
