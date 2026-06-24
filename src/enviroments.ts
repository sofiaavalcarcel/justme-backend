/* eslint-disable prettier/prettier */
export const enviroments = {
    dev: '.env',
    stg: '.stg.env',
    prod: '.prod.env',
    production: '.prod.env',
};

export function resolveEnvFile(): string {
    const nodeEnv = process.env.NODE_ENV as keyof typeof enviroments;
    return enviroments[nodeEnv] ?? enviroments.dev;
}

export function shouldIgnoreEnvFile(): boolean {
    return process.env.RENDER === 'true';
}
