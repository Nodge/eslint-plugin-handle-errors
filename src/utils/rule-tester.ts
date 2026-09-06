import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

RuleTester.it = it;
RuleTester.describe = describe;
RuleTester.itOnly = it.only;

type Rule = Parameters<RuleTester['run']>[1];
type Tests = Parameters<RuleTester['run']>[2];

const defaultTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
});

/**
 * Runs on the parser real users get from typescript-eslint. Type information is not requested:
 * nothing in the plugin asks for it yet, and a type-aware tester needs fixtures on disk.
 */
const typescriptTester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
});

/**
 * Runs the suite under both parsers, each against the same expectations. The plugin walks nodes
 * typescript-eslint shapes differently, so a verdict that holds on espree is not evidence it holds
 * for a TypeScript user.
 */
export function runRuleTester(name: string, rule: Rule, tests: Tests) {
    describe('espree', () => {
        defaultTester.run(name, rule, tests);
    });

    describe('typescript-eslint', () => {
        typescriptTester.run(name, rule, tests);
    });
}

/** Runs the suite under typescript-eslint only, for code espree cannot parse */
export function runTypescriptRuleTester(name: string, rule: Rule, tests: Tests) {
    describe('typescript-eslint (TypeScript-only syntax)', () => {
        typescriptTester.run(name, rule, tests);
    });
}
