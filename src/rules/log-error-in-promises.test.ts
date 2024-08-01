import dedent from 'dedent';
import { runRuleTester } from '../utils/rule-tester';
import { logErrorInPromises } from './log-error-in-promises';

runRuleTester('log-error-in-promises', logErrorInPromises, {
    valid: [
        {
            name: 'should detect console.error() call',
            code: dedent`
                promise1.catch(e => {
                    console.error(e)
                })
                promise2.catch(function(e) {
                    console.error(e)
                })
            `,
        },
        {
            name: 'should detect console.error() call with promise chain',
            code: dedent`
                promise1.then(callback).catch(e => {
                    console.error(e)
                })
                promise2.then(callback).catch(function(e) {
                    console.error(e)
                })
            `,
        },
        {
            name: 'should detect re-throw with original error',
            code: dedent`
                promise1.then(callback).catch(e => {
                    throw e
                })
                promise2.then(callback).catch(function(e) {
                    throw e
                })
            `,
        },
        {
            name: 'should detect throw with new error',
            code: dedent`
                promise1.then(callback).catch(e => {
                   throw new Error()
                })
                promise2.then(callback).catch(function(e) {
                   throw new Error()
                })
            `,
        },
        {
            name: 'should work with promises inside try-catch block',
            code: dedent`
                try {
                    promise.then(a).catch(e => {
                        throw e
                    })
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            name: 'should work with nested promises',
            code: dedent`
                promise1.then(a).catch(e => {
                    throw e
                    promise2.then(b).catch(e => {
                        throw e
                    })
                })
            `,
        },
        {
            name: 'should work with arrow function declared inside the catch function',
            code: dedent`
                promise.then(a).catch(e => {
                    const a = () => {
                        return
                    }
                    console.error(e)
                })
            `,
        },
        {
            name: 'should work with fat function declared inside the catch function',
            code: dedent`
                promise.then(a).catch(e => {
                    function a() {
                        return;
                    }
                    throw e;
                })
            `,
        },
        {
            name: 'should detect console calls inside every branch of code',
            code: dedent`
                promise.then(a).catch(e => {
                    if (isError(e)) {
                        console.warn(e);
                        return;
                    }
                    throw e;
                })
            `,
        },
        {
            name: 'should not yield on conditinal code if the error was logged before',
            code: dedent`
                promise.then(a).catch(e => {
                    console.error(e)
                    if (isError(e)) {
                        return
                    }
                });
            `,
        },
        {
            name: 'should not yield on conditinal code if there is no return statement',
            code: dedent`
                promise.then(a).catch(e => {
                    if (e instanceof NetworkError) {
                        // do something
                    }
                    throw e;
                })
            `,
        },
        {
            name: 'should work with single-line arrow function',
            code: dedent`
               promise.then(callback).catch(e => console.error(e))
            `,
        },
        {
            name: 'should work custom logger function',
            settings: {
                handleErrors: {
                    loggerFunctions: ['logError'],
                },
            },
            code: dedent`
                promise.then(callback).catch(e => {
                    logError(e)
                })
            `,
        },
        {
            name: 'should work with promise.catch with the reference to a logger function',
            code: dedent`
                promise.then(callback).catch(console.error)
            `,
        },
        {
            name: 'should work with promise.catch with the reference to a custom logger function',
            settings: {
                handleErrors: {
                    loggerFunctions: ['logError'],
                },
            },
            code: dedent`
                promise.then(callback).catch(logError)
            `,
        },
        {
            name: 'should work with passing the error to promise reject function',
            code: dedent`
                new Promise((resolve, reject) => {
                    getPromise().catch(() => {
                        reject();
                    });
                });

                new Promise((resolve, reject) => {
                    getPromise().catch(reject);
                });

                new Promise((resolve, reject) => {
                    getPromise().catch(err => reject(err));
                });
            `,
        },
        {
            name: 'should work with passing the error to renamed promise reject function',
            code: dedent`
                new Promise((resolve, reject) => {
                    const renamed = reject
                    getPromise().catch(renamed);
                });
            `,
        },
    ],
    invalid: [
        {
            name: 'should not accept unknown functions as error logger',
            code: dedent`
                promise1.catch(e => {
                    saveError(e)
                })
                promise2.then(callback).catch(function(e) {
                    saveError(e)
                })
                promise3.then(callback).catch(saveError)
            `,
            errors: [
                { messageId: 'error-not-handled' },
                { messageId: 'error-not-handled' },
                { messageId: 'error-not-handled' },
            ],
        },
        {
            name: 'should yield if some branch of code does not log errors',
            code: dedent`
                promise1.catch(e => {
                    if (isError(e)) {
                        console.error(e)
                    }
                })
                promise2.catch(function(e) {
                    if (isError(e)) {
                        console.error(e)
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }, { messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch function re-throws only inside conditional code',
            code: dedent`
                promise1.catch(e => {
                    if (isError(e)) {
                        throw e
                    }
                })
                promise2.catch(function(e) {
                    if (isError(e)) {
                        throw e
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }, { messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch function returns before re-throwing the error',
            code: dedent`
                promise.then(callback).catch(e => {
                    return;
                    throw e;
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch function returns before calling console.error',
            code: dedent`
                promise.then(callback).catch(e => {
                    return;
                    console.error(e)
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if conditional code does not log the error',
            code: dedent`
                promise.catch(e => {
                    if (isError(e)) {
                        return;
                    }
                    console.error(e);
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if one of the conditional code blocks does not log the error',
            code: dedent`
                promise.then(callback).catch(e => {
                    if (e) {
                        setError(e);
                        return
                    }
                    if (isError(e)) {
                        console.error(new Error('...', { cause: e }));
                        return
                    }
                    console.error(e)
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield for global reject function',
            code: dedent`
                promise.catch(e => reject(e));
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield for promise resolve function',
            code: dedent`
                new Promise((resolve) => {
                    promise.catch(e => resolve(e));
                });
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
    ],
});
