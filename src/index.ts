import { recommededConfig } from './configs/recommended';
import { logErrorInPromises } from './rules/log-error-in-promises';
import { logErrorInTrycatch } from './rules/log-error-in-trycatch';

const index = {
    configs: {},
    rules: {
        'log-error-in-trycatch': logErrorInTrycatch,
        'log-error-in-promises': logErrorInPromises,
    },
};

const legacyConfig = {
    rules: recommededConfig,
    plugins: ['handle-errors'],
};

const flatConfig = {
    rules: recommededConfig,
    plugins: {
        'handle-errors': index,
    },
};

export = {
    meta: {
        name: 'eslint-plugin-handle-errors',
        version: '0.2.0',
    },
    ...index,
    configs: {
        'flat/recommended': flatConfig,
        recommended: legacyConfig,
    },
};
