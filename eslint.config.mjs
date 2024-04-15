// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

export default tseslint.config(
    eslint.configs.recommended,
    eslintPlugin.configs['flat/recommended'],
    ...tseslint.configs.recommended
);
