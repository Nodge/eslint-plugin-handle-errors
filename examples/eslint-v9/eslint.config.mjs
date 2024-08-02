import eslint from '@eslint/js';
import handleErrors from 'eslint-plugin-handle-errors';

export default [
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
        languageOptions: {
            globals: {
                reportError: 'readonly',
                Sentry: 'readonly',
                console: 'readonly',
            },
        },
        settings: {
            handleErrors: {
                loggerFunctions: ['Sentry.captureException', 'reportError'],
            },
        },
    },
    eslint.configs.recommended,
    handleErrors.configs.recommended,
];
