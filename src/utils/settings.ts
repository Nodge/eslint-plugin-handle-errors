export interface Settings {
    readonly loggerFunctions: readonly LoggerFunction[];
    /** Entries of settings.handleErrors.loggerFunctions that could not be parsed */
    readonly invalidLoggerFunctions: readonly string[];
}

/** A logger name split into segments: `this.logger.error` is `['this', 'logger', 'error']` */
type LoggerFunction = {
    readonly path: readonly string[];
};

const defaultLoggerFunctions = ['console.warn', 'console.error'] as const;

/** Matches a JS identifier, and the keywords `this`/`super` along with it */
const segmentPattern = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;

const defaultSettings: Settings = parseLoggerFunctions(defaultLoggerFunctions);

export function parseSettings(settings: unknown): Settings {
    if (!isObject(settings)) return defaultSettings;
    if (!isObject(settings.handleErrors)) return defaultSettings;

    return parsePluginSettings(settings.handleErrors);
}

function parsePluginSettings(settings: Record<PropertyKey, unknown>): Settings {
    const { loggerFunctions = defaultLoggerFunctions } = settings;

    if (!Array.isArray(loggerFunctions)) {
        throw new Error(
            `Invalid configuration value for settings.handleErrors.loggerFunctions. The value must be array of strings. Got: ${loggerFunctions}`
        );
    }

    return parseLoggerFunctions(loggerFunctions);
}

/**
 * Splits logger names into segment paths. An unparseable entry is collected instead of throwing:
 * a typo in the configuration should not take the whole ESLint run down.
 */
function parseLoggerFunctions(value: readonly unknown[]): Settings {
    const loggerFunctions: LoggerFunction[] = [];
    const invalidLoggerFunctions: string[] = [];

    for (const name of value) {
        if (!isString(name)) {
            invalidLoggerFunctions.push(JSON.stringify(name) ?? String(name));
            continue;
        }

        const path = name.split('.');

        if (path.every(segment => segmentPattern.test(segment))) {
            loggerFunctions.push({ path });
        } else {
            invalidLoggerFunctions.push(name);
        }
    }

    return { loggerFunctions, invalidLoggerFunctions };
}

function isObject(settings: unknown): settings is Record<PropertyKey, unknown> {
    return settings !== null && typeof settings === 'object';
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}
