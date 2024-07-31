import dedent from 'dedent';
import { runRuleTester } from '../utils/rule-tester';
import { logErrorInTrycatch } from './log-error-in-trycatch';

runRuleTester('log-error-in-trycatch', logErrorInTrycatch, {
    valid: [
        {
            name: 'should detect console.error() call',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            name: 'should detect re-throw with original error',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    throw e
                }
            `,
        },
        {
            name: 'should detect throw with new error',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    throw new Error()
                }
            `,
        },
        {
            name: 'should work with nested try-catch blocks',
            code: dedent`
                try {
                    try {
                        await query()
                    } catch (e) {
                        console.error(e)
                    }
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            name: 'should work with nested try-catch blocks with different logging methods',
            code: dedent`
                try {
                    try {
                        await query()
                    } catch (e) {
                        throw e
                    }
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            name: 'should wotk with return statement at the end of catch block',
            code: dedent`
                async function test() {
                    try {
                        await query()
                    } catch(e) {
                        console.error(e)
                        return
                    }
                }
            `,
        },
        {
            name: 'should work with arrow function declared inside the catch block',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    const a = () => {
                        return
                    }
                    console.error(e)
                }
            `,
        },
        {
            name: 'should work with fat function declared inside the catch block',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    function a() {
                        return;
                    }
                    throw e;
                }
            `,
        },
        {
            name: 'should detect console calls inside every branch of code',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        if (isError(e)) {
                            console.warn(e)
                            return
                        }
                        console.error(e)
                    }
                }
            `,
        },
        {
            name: 'should not yield on conditinal code if the error was logged before',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        console.error(e)
                        if (isError(e)) {
                            return
                        }
                    }
                }
            `,
        },
        {
            name: 'should not yield on conditinal code if there is no return statement',
            code: dedent`
                try {
                    await fetch();
                } catch(e) {
                    if (e instanceof NetworkError) {
                        // do something
                    }
                    throw e;
                }
            `,
        },
        {
            name: 'should work with custom logger functions',
            settings: {
                handleErrors: {
                    loggerFunctions: ['logError'],
                },
            },
            code: dedent`
                try {
                    await fetch();
                } catch(e) {
                    logError(e);
                }
            `,
        },
    ],
    invalid: [
        {
            name: 'should not accept unknown functions as error logger',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    saveError(e);
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if some branch of code does not log errors',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    if (isError(e)) {
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block re-throws only inside conditional code',
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    if (isError(e)) {
                        throw e
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if outer try-catch block does not log errors',
            code: dedent`
                try {
                    try {
                        await query()
                    } catch (e) {
                        throw e
                    }
                } catch(e) {
                    setError(e)
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if inner try-catch block does not log errors',
            code: dedent`
                try {
                    try {
                        await query()
                    } catch (e) {
                        saveError(e);
                    }
                } catch(e) {
                    throw e
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block returns before re-throwing the error',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        return;
                        throw e
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block returns before calling console.error',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        return;
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if conditional code does not log the error',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        if (isError(e)) {
                            return
                        }
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if one of the conditional code blocks does not log the error',
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        if (e) {
                            setError(e);
                            return
                        }
                        if (isError(e)) {
                            console.error(new Error('...', { cause: e }));
                            return
                        }
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
    ],
});
