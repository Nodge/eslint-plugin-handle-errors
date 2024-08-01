export interface Settings {
    readonly loggerFunctions: readonly LoggerFunction[];
}

type LoggerFunction = {
    object?: string;
    method: string;
};

const defaultLoggerFunctions = ['console.warn', 'console.error'] as const;

const defaultSettings: Settings = {
    loggerFunctions: parseLoggerFunctions(defaultLoggerFunctions),
};

export function parseSettings(settings: unknown): Settings {
    if (!isObject(settings)) return defaultSettings;
    if (!isObject(settings.handleErrors)) return defaultSettings;

    return parsePluginSettings(settings.handleErrors);
}

function parsePluginSettings(settings: Record<PropertyKey, unknown>): Settings {
    const { loggerFunctions = defaultLoggerFunctions } = settings;

    if (!isArrayOfString(loggerFunctions)) {
        throw new Error(
            `Invalid configuration value for settings.handleErrors.loggerFunctions. The value must be array of strings. Got: ${loggerFunctions}`
        );
    }

    return {
        loggerFunctions: parseLoggerFunctions(loggerFunctions),
    };
}

function parseLoggerFunctions(value: readonly string[]): LoggerFunction[] {
    return value.map(name => {
        const parts = name.split('.');

        if (parts.length === 1) {
            return { method: name };
        }

        if (parts.length === 2) {
            return { object: parts[0]!, method: parts[1]! };
        }

        throw new Error(`Unsupported type of logger expression: ${name}`);
    });
}

function isObject(settings: unknown): settings is Record<PropertyKey, unknown> {
    return settings !== null && typeof settings === 'object';
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isArrayOfString(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isString);
}
