import { recommededConfig } from './configs/recommended';
import { logErrorInTrycatch } from './rules/log-error-in-trycatch';

const index = {
    configs: {},
    rules: {
        'log-error-in-trycatch': logErrorInTrycatch,
    },
};

const legacyConfig = {
    ...recommededConfig,
    plugins: ['handle-errors'],
};

const flatConfig = {
    ...recommededConfig,
    plugins: {
        'handle-errors': index,
    },
};

export = {
    ...index,
    configs: {
        'flat/recommended': flatConfig,
        recommended: legacyConfig,
    },
};
