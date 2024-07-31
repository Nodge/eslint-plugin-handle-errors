export function createCallExpression(logger: string): string {
    const parts = logger.split('.');

    if (parts.length === 1) {
        return `CallExpression[callee.name='${parts[0]}']`;
    }
    if (parts.length === 2) {
        return `CallExpression[callee.object.name="${parts[0]}"][callee.property.name="${parts[1]}"]`;
    }

    throw new Error(`Unsupported type of logger expression: ${logger}`);
}

export function createMemberExpression(logger: string): string {
    const parts = logger.split('.');

    if (parts.length === 1) {
        return `Identifier[name='${parts[0]}']`;
    }
    if (parts.length === 2) {
        return `MemberExpression[object.name="${parts[0]}"][property.name="${parts[1]}"]`;
    }

    throw new Error(`Unsupported type of logger expression: ${logger}`);
}
