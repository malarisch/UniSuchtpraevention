import {Queue, Job} from 'bullmq'
import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
import {logger as loggerConstructor} from './index'

import IORedis, { Redis } from 'ioredis';


const logger = await loggerConstructor.logger();
export const aiAnalysisQueueName = 'aiAnalysis'
export const lyricsFetcherQueueName = 'lyricsFetcher'
export const songFetcherQueueName = 'songFetcher'

export const redisConnection = new IORedis({ maxRetriesPerRequest: null, host: process.env.REDIS_HOST as string, port: parseInt(process.env.REDIS_PORT as string) as number });

interface QueuesInterface {
    aiAnalysisQueue: Queue,
    lyricsFetcherQueue: Queue,
    songFetcherQueue: Queue
}


export const QueueList: QueuesInterface = {
            aiAnalysisQueue: new Queue(aiAnalysisQueueName, {
                connection: redisConnection

            }),
            lyricsFetcherQueue: new Queue(lyricsFetcherQueueName, {
                connection: redisConnection
            }),
            songFetcherQueue: new Queue(songFetcherQueueName, {
                connection: redisConnection
            })
        }


