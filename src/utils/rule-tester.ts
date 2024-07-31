import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

RuleTester.it = it;
RuleTester.describe = describe;
RuleTester.itOnly = it.only;

export function runRuleTester(...args: Parameters<RuleTester['run']>) {
    const config = {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    } as const;

    return new RuleTester(config).run(...args);
}
