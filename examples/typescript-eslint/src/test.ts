declare const Sentry: {
    captureException: (e: unknown) => void;
};

export function validCapturedException() {
    try {
        // do nothing
    } catch (e) {
        Sentry.captureException(e);
    }
}

export function validReportError() {
    try {
        // do nothing
    } catch (e) {
        reportError(e);
    }
}

export function invalidConsoleWarn() {
    try {
        // do nothing
        // eslint-disable-next-line handle-errors/log-error-in-trycatch
    } catch (e) {
        console.warn(e);
    }
}

export function invalidConsoleError() {
    try {
        // do nothing
        // eslint-disable-next-line handle-errors/log-error-in-trycatch
    } catch (e) {
        console.error(e);
    }
}

export function validPromiseCatch() {
    Promise.reject().catch(reportError);
}

export function invalidPromiseReject() {
    // eslint-disable-next-line handle-errors/log-error-in-promises
    Promise.reject().catch(() => {
        // do nothing
    });
}
