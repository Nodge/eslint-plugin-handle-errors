import { RuleTester, ESLint, Linter } from 'eslint';
import { describe, it } from 'vitest';

RuleTester.it = it;
RuleTester.describe = describe;
RuleTester.itOnly = it.only;

type Rule = Parameters<RuleTester['run']>[1];
type Tests = Parameters<RuleTester['run']>[2];

export function runRuleTester(name: string, rule: Rule, tests: Tests) {
    const version = Number(ESLint.version.split('.').at(0) ?? '0');
    const config = getConfig(version);
    return new RuleTester(config).run(name, rule, mapTests(version, tests));
}

function getConfig(version: number): Linter.Config {
    if (version <= 8) {
        return {
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
        } as Linter.Config;
    }

    return {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
        },
    };
}

function mapTests(version: number, tests: Tests): Tests {
    if (version <= 7) {
        return {
            valid: tests.valid.map(test => {
                if (typeof test === 'string') {
                    return { code: test };
                }
                delete test.name;
                return test;
            }),
            invalid: tests.invalid.map(test => {
                delete test.name;
                return test;
            }),
        };
    }

    return tests;
}
