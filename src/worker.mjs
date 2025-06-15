/**
 * Background worker processing BullMQ jobs for fetching songs and lyrics.
 */
process.env.APP_NAME = "worker"

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import 'dotenv/config'
import * as geniusFetcher from './modules/geniusFetcher.mjs'
import * as lyricsFetcher from './modules/lyricsFetcher.mjs'
import * as database from './modules/database.mjs'
import loggerConstructor from './modules/logger.mjs'
const logger = loggerConstructor("worker")
logger.debug("Worker Script loaded")

database.sync()
const connection = new IORedis({ maxRetriesPerRequest: null, host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });

const songFetcherQueue = new Worker(
  'songFetcher',
  async job => {
    // Will print { foo: 'bar'} for the first job
    // and { qux: 'baz' } for the second.
    console.log(job.data);
    logger.info("songFetcher got Job:", job.data)
    if (job.data.songId == undefined) {
      if (job.data.searchString == undefined) {
        return new Error("No Data Supplied")
      } else {
        let searchResult = await  await geniusFetcher.searchSong(job.data.searchString)
        await job.updateData({ songId: searchResult[0].result.id })
      }
    }


    return await geniusFetcher.addSongAndArtistToDatabase(await geniusFetcher.getSong(job.data.songId))
  },
  { connection },
);
const lyricsFetcherQueue = new Worker(
  'lyricsFetcher',
  async job => {

      console.log(job.data);
      let song = null
      logger.info("lyricsFetcher got Job:", job.data)
      if (job.data.url == undefined && job.data.geniusId != undefined) {
        await job.updateData(await geniusFetcher.getSong(job.data.geniusId))
        song = await database.Song.findOne({where: {"geniusId": job.data.geniusId}})
        await job.updateData(song)
      } else if (job.data.id != undefined) {
        let song = await database.Song.findByPk(job.data.internalId)
        await job.updateData(song)
      } else if (job.data.url != undefined) {
        song = await database.Song.findOne({where: {"geniusURL": job.data.url}})
        await job.updateData(song)
      }
      let lyrics = await lyricsFetcher.lyricsFromURL(job.data.geniusURL)
      logger.info("Got Lyrics " + lyrics.length)
      logger.debug(lyrics)
      console.log("Updating")
      console.log(await song.update({lyrics: lyrics}))
      logger.info("Added Lyrics to " + song.title + " with length " + lyrics.length)
      return song.toJSON();
    

  },
  { connection },
); 