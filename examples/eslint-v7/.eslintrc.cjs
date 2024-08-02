/* eslint-env node */
module.exports = {
    root: true,
    extends: ['plugin:handle-errors/recommended', 'plugin:eslint-comments/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    settings: {
        handleErrors: {
            loggerFunctions: ['Sentry.captureException', 'reportError'],
        },
    },
    rules: {
        'eslint-comments/no-unused-disable': 'error',
    },
};
