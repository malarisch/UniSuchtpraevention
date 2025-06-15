import dotenv from 'dotenv';
dotenv.config();

export async function logger(): Promise<import('pino').Logger> {
    const pinoLoki = (await import('pino-loki')).default;
    const pino = (await import('pino')).default;

    const lokiUrl: string = process.env.LOKI_URL as string;

    const stream = pinoLoki({
        host: lokiUrl,
        labels: { app: process.env.LOGGER_APP_NAME || 'unnamed' },
        interval: 5, // batch every 5 sec
        timeout: 10000,
        headers: process.env.LOKI_HEADERS ? {
            Authorization: process.env.LOKI_HEADERS.split('=')[1]
        } : undefined
    });

    const logger = pino(
        { level: process.env.LOG_LEVEL || 'info' },
        stream
    );
    return logger;
};