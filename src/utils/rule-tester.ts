import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

RuleTester.it = it;
RuleTester.describe = describe;
RuleTester.itOnly = it.only;

type Rule = Parameters<RuleTester['run']>[1];
type Tests = Parameters<RuleTester['run']>[2];

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
    },
});

export function runRuleTester(name: string, rule: Rule, tests: Tests) {
    return ruleTester.run(name, rule, tests);
}
