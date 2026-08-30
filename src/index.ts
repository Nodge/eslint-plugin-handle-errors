import type { ESLint, Linter } from 'eslint';
import { recommededConfig } from './configs/recommended';
import { logErrorInPromises } from './rules/log-error-in-promises';
import { logErrorInTrycatch } from './rules/log-error-in-trycatch';

/** Injected from package.json at build time, see tsup.config.ts */
declare const __PLUGIN_VERSION__: string;

const plugin = {
    meta: {
        name: 'eslint-plugin-handle-errors',
        version: __PLUGIN_VERSION__,
    },
    rules: {
        'log-error-in-trycatch': logErrorInTrycatch,
        'log-error-in-promises': logErrorInPromises,
    },
    configs: {
        recommended: {
            plugins: {
                get 'handle-errors'(): ESLint.Plugin {
                    return plugin;
                },
            },
            rules: recommededConfig,
        } satisfies Linter.Config,
    },
} satisfies ESLint.Plugin;

export = plugin;
