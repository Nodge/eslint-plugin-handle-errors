import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import handleErrors from 'eslint-plugin-handle-errors';

export default [
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
        settings: {
            handleErrors: {
                loggerFunctions: ['Sentry.captureException', 'reportError'],
            },
        },
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    handleErrors.configs['flat/recommended'],
];
