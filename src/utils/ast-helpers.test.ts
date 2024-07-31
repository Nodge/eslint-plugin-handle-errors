import { describe, expect, it } from 'vitest';
import { createCallExpression, createMemberExpression } from './ast-helpers';

describe('createCallExpression', () => {
    it('should parse function call', () => {
        const logger = 'logError';

        const expression = createCallExpression(logger);

        expect(expression).toBe("CallExpression[callee.name='logError']");
    });

    it('should parse object method call', () => {
        const logger = 'Sentry.captureException';

        const expression = createCallExpression(logger);

        expect(expression).toBe('CallExpression[callee.object.name="Sentry"][callee.property.name="captureException"]');
    });
});

describe('createMemberExpression', () => {
    it('should parse function call', () => {
        const logger = 'logError';

        const expression = createMemberExpression(logger);

        expect(expression).toBe("Identifier[name='logError']");
    });

    it('should parse object method call', () => {
        const logger = 'Sentry.captureException';

        const expression = createMemberExpression(logger);

        expect(expression).toBe('MemberExpression[object.name="Sentry"][property.name="captureException"]');
    });
});
