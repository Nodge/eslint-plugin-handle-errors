import dedent from 'dedent';
import { runRuleTester } from '../utils/ruleTester';
import { logErrorInTrycatch } from './log-error-in-trycatch';

runRuleTester('log-error-in-trycatch', logErrorInTrycatch, {
    valid: [
        {
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    console.error(e)
                }
            `,
        },
        {
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    throw e
                }
            `,
        },
        {
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    throw new Error()
                }
            `,
        },
        {
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
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    function a() {
                        return;
                    }
                    console.error(e)
                }
            `,
        },
        {
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    const a = () => {
                        return
                    }
                   throw e
                }
            `,
        },
        {
            code: dedent`
                try {
                    await query()
                } catch(e) {
                    function a() {
                        return;
                    }
                    throw e
                }
            `,
        },
        {
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
            code: dedent`
                function test() {
                    try {

                    } catch(e) {
                        if (isError(e)) {
                            console.error(new Error('...', { cause: e }));
                            return
                        }
                        console.error(e)
                    }
                }
            `,
        },
        {
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
            code: dedent`
                try {
                    await fetch();
                } catch(e) {
                    if (e instanceof NetworkError) {
                        showError('Network error');
                    }
                    throw e;
                }
            `,
        },
    ],
    invalid: [
        {
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
            code: dedent`
                try {
                    try {
                        await query()
                    } catch (e) {

                    }
                } catch(e) {
                    throw e
                }
            `,
            errors: [{ messageId: 'error-not-handled' }],
        },
        {
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
