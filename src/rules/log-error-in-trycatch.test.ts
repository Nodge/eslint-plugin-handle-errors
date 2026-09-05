import dedent from 'dedent';
import { runRuleTester } from '../utils/rule-tester';
import { logErrorInTrycatch } from './log-error-in-trycatch';

runRuleTester('log-error-in-trycatch', logErrorInTrycatch, {
    valid: [
        {
            name: 'should detect console.error() call',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            name: 'should detect re-throw with original error',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    throw e
                }
            `,
        },
        {
            name: 'should detect throw with new error',
            code: dedent`
                try {
                    query()
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
                        query()
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
                        query()
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
                        query()
                    } catch(e) {
                        console.error(e)
                        return
                    }
                }
            `,
        },
        {
            name: 'should detect a logger call returned from the catch block',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        return console.error(e)
                    }
                }
            `,
        },
        {
            name: 'should detect a logger call in a loop that always runs at least once',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    do {
                        console.error(e)
                    } while (hasMore())
                }
            `,
        },
        {
            name: 'should detect a logger call in a retry loop that never exits',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    for (;;) {
                        console.error(e)
                        retry()
                    }
                }
            `,
        },
        {
            name: 'should work with try-finally inside the catch block',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    try {
                        console.error(e)
                    } finally {
                        cleanup()
                    }
                }
            `,
        },
        {
            name: 'should work with arrow function declared inside the catch block',
            code: dedent`
                try {
                    query()
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
                    query()
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
            name: 'should detect a logger call in every branch of a switch statement',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.warn(e)
                                return 1
                            default:
                                console.error(e)
                                return 2
                        }
                    }
                }
            `,
        },
        {
            name: 'should detect a logger call shared by fallthrough switch cases',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                            case 2:
                                console.warn(e)
                                return 1
                            default:
                                console.error(e)
                                return 2
                        }
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
                    fetch();
                } catch(e) {
                    if (e instanceof NetworkError) {
                        // do something
                    }
                    throw e;
                }
            `,
        },
        {
            name: 'should work with a logger call after a try-finally inside the catch block',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    try {
                        cleanup()
                    } finally {
                        release()
                    }
                    console.error(e)
                }
            `,
        },
        {
            name: 'should work with a statement before the logger call when the try has a finalizer',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    cleanup()
                    console.error(e)
                } finally {
                    release()
                }
            `,
        },
        {
            name: 'should work with a nested try-catch opening the enclosing try block',
            code: dedent`
                try {
                    try {
                        query()
                    } catch (e) {
                        cleanup()
                        console.error(e)
                    }
                } catch(outer) {
                    console.error(outer)
                }
            `,
        },
        {
            name: 'should ignore unreachable code after the error is re-thrown',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    throw e
                    while (true) {
                        break
                    }
                }
            `,
        },
        {
            name: 'should work with a logger call after a loop in the catch block',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    for (const listener of listeners) {
                        listener(e)
                    }
                    console.error(e)
                }
            `,
        },
        {
            name: 'should work with a try-finally inside a catch block that is itself inside a try',
            code: dedent`
                function test() {
                    try {
                        try {
                            query()
                        } catch (e) {
                            try {
                                cleanup()
                            } finally {
                                release()
                            }
                            console.error(e)
                        }
                    } finally {
                        done()
                    }
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
                    fetch();
                } catch(e) {
                    logError(e);
                }
            `,
        },
        {
            name: 'should work with a logger behind a member chain',
            settings: {
                handleErrors: {
                    loggerFunctions: ['app.log.error'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    app.log.error(e);
                }
            `,
        },
        {
            name: 'should work with a logger on this',
            settings: {
                handleErrors: {
                    loggerFunctions: ['this.logger.error'],
                },
            },
            code: dedent`
                class Api {
                    load() {
                        try {
                            fetch();
                        } catch(e) {
                            this.logger.error(e);
                        }
                    }
                }
            `,
        },
        {
            name: 'should work with a logger on super',
            settings: {
                handleErrors: {
                    loggerFunctions: ['super.logger.error'],
                },
            },
            code: dedent`
                class Api extends Base {
                    load() {
                        try {
                            fetch();
                        } catch(e) {
                            super.logger.error(e);
                        }
                    }
                }
            `,
        },
        {
            name: 'should work with a logger on import.meta',
            settings: {
                handleErrors: {
                    loggerFunctions: ['import.meta.logger.error'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    import.meta.logger.error(e);
                }
            `,
        },
        {
            name: 'should work with a logger named with non-ascii identifiers',
            settings: {
                handleErrors: {
                    loggerFunctions: ['журнал.ошибка'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    журнал.ошибка(e);
                }
            `,
        },
        {
            name: 'should treat an optional logger call as handling',
            settings: {
                handleErrors: {
                    loggerFunctions: ['app.log.error'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    app.log?.error(e);
                }
            `,
        },
        {
            name: 'should work with passing the error to promise reject function',
            code: dedent`
                new Promise((resolve, reject) => {
                    try {
                        fn();
                    } catch (err) {
                        reject(err);
                    }
                });
            `,
        },
    ],
    invalid: [
        {
            name: 'should not accept a shorter chain than the configured logger',
            settings: {
                handleErrors: {
                    loggerFunctions: ['this.logger.error'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    logger.error(e);
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should report a non-string logger function instead of crashing',
            settings: {
                handleErrors: {
                    loggerFunctions: ['console.error', null],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    console.error(e);
                }
            `,
            errors: [{ messageId: 'invalid-logger-function' }],
        },
        {
            name: 'should report an unparseable logger function instead of crashing',
            settings: {
                handleErrors: {
                    loggerFunctions: ['logger..error'],
                },
            },
            code: dedent`
                try {
                    fetch();
                } catch(e) {
                    throw e;
                }
            `,
            errors: [{ messageId: 'invalid-logger-function' }],
        },
        {
            name: 'should not accept unknown functions as error logger',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    saveError(e);
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a conditional expression logs the error in one branch only',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    isError(e) ? console.error(e) : setError(e)
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block retries forever without logging',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    for (;;) {
                        retry()
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the error is logged only in a loop that may not run',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        while (hasMore()) {
                            console.error(e)
                            if (isFatal(e)) {
                                return
                            }
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield for a handler initialised from itself',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    var handler = handler
                    handler(e)
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if some branch of code does not log errors',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    if (isError(e)) {
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a switch case does not log the error',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.error(e)
                                return 1
                            default:
                                return 2
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a switch case falls through into a case that does not log',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.warn(e)
                            case 2:
                                return 2
                            default:
                                console.error(e)
                                return 3
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a switch case breaks out of the switch without logging',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.warn(e)
                                break
                            default:
                                break
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a default case declared in the middle does not log the error',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.warn(e)
                                return 1
                            default:
                                return 2
                            case 2:
                                console.warn(e)
                                return 3
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if a switch without a default case logs the error in every case',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        switch (e.code) {
                            case 1:
                                console.error(e)
                                return 1
                            case 2:
                                console.warn(e)
                                return 2
                        }
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block returns through a finalizer before logging',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        try {
                            return
                        } finally {
                            cleanup()
                        }
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield for both handlers if a nested catch block returns without logging',
            code: dedent`
                function test() {
                    try {
                        query()
                    } catch(e) {
                        try {
                            retry()
                        } catch (inner) {
                            return
                        }
                        console.error(e)
                    }
                }
            `,
            errors: [{ messageId: 'error-not-handled' }, { messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block does not log and the try has a finalizer',
            code: dedent`
                try {
                    query()
                } catch(e) {
                    cleanup()
                } finally {
                    release()
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield if the catch block re-throws only inside conditional code',
            code: dedent`
                try {
                    query()
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
                        query()
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
                        query()
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
        {
            name: 'should yield for global reject function',
            code: dedent`
                try {
                    fn();
                } catch (err) {
                    reject(err);
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
            name: 'should yield for promise resolve function',
            code: dedent`
                new Promise((resolve) => {
                    try {
                        fn();
                    } catch (err) {
                        resolve(err);
                    }
                });
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
    ],
});
