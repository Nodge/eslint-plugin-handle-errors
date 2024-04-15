import dedent from 'dedent';
import { runRuleTester } from '../utils/ruleTester';
import { logErrorInPromises } from './log-error-in-promises';

runRuleTester('log-error-in-promises', logErrorInPromises, {
    valid: [
        {
            code: dedent`
                a.catch(e => {
                    console.error(e)
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
                    console.error(e)
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
                    throw e
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
                   throw new Error()
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    console.error(e)
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    throw e
                })
            `,
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    throw new Error()
                })
            `,
        },
        {
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
            code: dedent`
                promise1.then(a).catch(e => {
                    const a = () => {
                        return
                    }
                    console.error(e)
                })
            `,
        },
        {
            code: dedent`
                promise1.then(a).catch(e => {
                    function a() {
                        return;
                    }
                    console.error(e)
                })
            `,
        },
        {
            code: dedent`
                promise1.then(a).catch(e => {
                    function a() {
                        return;
                    }
                    throw e;
                })
            `,
        },
        {
            code: dedent`
                promise1.then(a).catch(e => {
                    if (isError(e)) {
                        console.warn(e);
                        return;
                    }
                    throw e;
                })
            `,
        },
        {
            code: dedent`
                promise1.then(a).catch(e => {
                    if (e instanceof NetworkError) {
                        showError('Network error');
                    }
                    throw e;
                })
            `,
        },
        {
            code: dedent`
               a.then(callback).catch(e => console.error(e))
            `,
        },
        {
            code: dedent`
               a.then(callback).catch(console.error)
            `,
        },
        {
            settings: {
                handleErrors: {
                    loggerFunctions: ['logError'],
                },
            },
            code: dedent`
               a.then(callback).catch(logError)
            `,
        },
    ],
    invalid: [
        {
            code: dedent`
                a.then(onSuccess).catch(e => {
                    if (isError(e)) {
                        throw e
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.catch(e => {
                    if (isError(e)) {
                        throw e
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.catch(e => {
                    if (isError(e)) {
                        throw new Error();
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.catch(e => {
                    if (isError(e)) {
                        console.error(e)
                    }
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.catch(e => {
                    saveError(e)
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    saveError(e)
                })
           `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    if (isError(e)) {
                        console.error(e)
                    }
                })
           `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    if (isError(e)) {
                        throw e
                    }
                })
           `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(function(e) {
                    if (isError(e)) {
                        throw new Error()
                    }
                })
           `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(onError)
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
                    return;
                    throw e;
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
                    return;
                    console.error(e)
                })
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            code: dedent`
                a.then(callback).catch(e => {
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
    ],
});
