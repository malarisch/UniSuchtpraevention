import dotenv from 'dotenv';
dotenv.config();
import { InfluxDBClient, Point } from '@influxdata/influxdb3-client';
import pretty from 'pino-pretty'
import {log} from "@adminjs/express";
export async function logger(): Promise<import('pino').Logger> {
    const pino = (await import('pino')).default;
    console.log("Logging Local: ", process.env.LOGGING_LOCAL)
    if (process.env.LOGGING_LOCAL == "true") {

        const logger = pino({
            level: 'debug',
            transport: {
                target: 'pino-pretty'
            }
        })
        return logger;
    } else {
        const pinoLoki = (await import('pino-loki')).default;



        const lokiUrl: string = process.env.LOKI_URL as string;

        const stream = {
            host: lokiUrl,
            labels: {app: process.env.LOGGER_APP_NAME || 'unnamed'},
            interval: 5, // batch every 5 sec
            timeout: 10000,
            headers: process.env.LOKI_HEADERS ? {
                Authorization: process.env.LOKI_HEADERS.split('=')[1]
            } : undefined
        };

        const transport = pino.transport({
            targets: [
                {'target': "pino-loki", options: stream},
                {
                    target: './pino-pretty-transport.cjs',
                    options: {
                        //@ts-ignore
                        "colorize": true
                    }
                },

            ],
            sync: true

        })
        const logger = pino(
            {level: process.env.LOG_LEVEL || 'info'},
            transport
        );
        return logger
    }

};

var localLogger = await logger()
const influxHost: string = process.env.INFLUXDB_HOST ?? ''
const influxDatabase: string = process.env.INFLUXDB_DATABASE ?? ''
const influxToken: string = process.env.INFLUXDB_TOKEN ?? ''
export const influxClient = new InfluxDBClient({ host: influxHost, token: influxToken, database: influxDatabase })

export async function writeInflux(points: Point[]) {
    try {
        await influxClient.write(points, influxDatabase);
        
    } catch (e) {
        localLogger.error(e)
    }
}

export async function exportTaskTime(taskName: string, duration: number) {
    try {
        await writeInflux([Point.measurement("taskTime").setTag("taskName", taskName).setTag('unit', "milliseconds").setFloatField("duration", duration).setTimestamp(new Date())],)
    } catch (e) {
        localLogger.error(e)
        return e;
    }


}