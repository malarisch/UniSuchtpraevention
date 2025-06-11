import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config'


const connection = new IORedis({ maxRetriesPerRequest: null, host: process.env.REDIS_HOST, port: provess.env.REDIS_HOST });

const worker = new Worker(
  'foo',
  async job => {
    // Will print { foo: 'bar'} for the first job
    // and { qux: 'baz' } for the second.
    console.log(job.data);
  },
  { connection },
);