// @ts-check

import js from '@eslint/js';
import ts from 'typescript-eslint';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

export default ts.config(
    {
        ignores: ['dist/**/*', 'examples/**/*'],
    },
    js.configs.recommended,
    eslintPlugin.configs.recommended,
    ...ts.configs.recommended,
    {
        files: ['src/rules/*.ts'],
        ignores: ['src/rules/*.test.ts'],
        rules: {
            // The rule docs and the README table are generated from this metadata,
            // see .eslint-doc-generatorrc.mjs.
            'eslint-plugin/require-meta-docs-description': ['error', { pattern: '^(Enforce|Require|Disallow)' }],
            'eslint-plugin/require-meta-docs-url': [
                'error',
                {
                    pattern: 'https://github.com/Nodge/eslint-plugin-handle-errors/blob/main/docs/rules/{{name}}.md',
                },
            ],
        },
    }
);
