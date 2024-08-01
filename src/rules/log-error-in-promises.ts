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
        const tracker = createLoggerCallTracker({
            settings,
            context,
            messageId: 'error-not-handled',
        });

        const catchCall = 'CallExpression[callee.property.name="catch"]';
        const catchCallWithArg = `${catchCall}[arguments.length=1]`;

        return {
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
