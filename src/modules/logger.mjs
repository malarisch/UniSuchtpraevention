import pino from 'pino';
import { pinoLoki } from 'pino-loki';
import dotenv from 'dotenv';
dotenv.config();



export default function (APP_NAME) {
    const stream = pinoLoki({
        host: process.env.LOKI_URL,
        labels: { app: APP_NAME || 'unnamed' },
        interval: 5, // batch every 5 sec
        timeout: 10000,
        basicAuth: process.env.LOKI_BASIC_AUTH,
        headers: process.env.LOKI_HEADERS ? {
            Authorization: process.env.LOKI_HEADERS.split('=')[1]
        } : undefined
    });

    const logger = pino(
        { level: process.env.LOG_LEVEL || 'info' },
        stream
    );
    return logger
};