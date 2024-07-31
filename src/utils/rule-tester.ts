import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

// Override the default `it` and `describe` functions to use `vitest`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(RuleTester as any).it = it;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(RuleTester as any).describe = describe;

export function runRuleTester(...args: Parameters<RuleTester['run']>) {
    const config = {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    } as const;

    return new RuleTester(config).run(...args);
}
