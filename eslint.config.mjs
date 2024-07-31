// @ts-check

import js from '@eslint/js';
import ts from 'typescript-eslint';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

export default ts.config(
    {
        ignores: ['dist/**/*'],
    },
    js.configs.recommended,
    eslintPlugin.configs['flat/recommended'],
    ...ts.configs.recommended
);
