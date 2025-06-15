/**
 * Background worker processing BullMQ jobs for fetching songs and lyrics.
 */

import { Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import 'dotenv/config'
import { geniusFetcher, lyricsFetcher, database, aiConnector, logger as loggerConstructor } from './modules/index.ts'
import { InferAttributes, InferCreationAttributes } from 'sequelize';

const logger = await loggerConstructor.logger()
logger.debug("Worker Script loaded")

database.sync()

const connection = new IORedis({ maxRetriesPerRequest: null, host: process.env.REDIS_HOST as string, port: parseInt(process.env.REDIS_PORT as string) as number });

const songFetcherQueue = new Worker(
  'songFetcher',
  async job => {

    console.log(job.data);
    logger.info("songFetcher got Job:", job.data)
    if (job.data.songId == undefined) {
      if (job.data.searchString == undefined) {
        return new Error("No Data Supplied")
      } else {
        let searchResult = await await geniusFetcher.searchSong(job.data.searchString)
        await job.updateData({ songId: searchResult[0].result.id })
      }
    }


    return await geniusFetcher.addSongAndArtistToDatabase(await geniusFetcher.getSong(job.data.songId))
  },
  { connection },
);


/**
 * Starts Worker to process the queue to fetch the lyrics
 */
const lyricsFetcherQueue = new Worker(
  'lyricsFetcher',
  async job => {

    console.log(job.data);
    let song: database.Song
    logger.info("lyricsFetcher got Job:", job.data)
    if (job.data.url == undefined && job.data.geniusId != undefined) {
      await job.updateData(await geniusFetcher.getSong(job.data.geniusId))
      song = await database.Song.findOne({ where: { "geniusId": job.data.geniusId } }) as database.Song
      await job.updateData(song)
    } else if (job.data.id != undefined) {
      song = await database.Song.findByPk(job.data.internalId) as database.Song
      await job.updateData(song)
    } else if (job.data.url != undefined) {
      song = await database.Song.findOne({ where: { "geniusURL": job.data.url } }) as database.Song
      await job.updateData(song)
    } else {
      return null
    }
    let lyrics = await lyricsFetcher.lyricsFromURL(job.data.geniusURL)
    logger.info("Got Lyrics " + lyrics.length)
    logger.debug(lyrics)
    console.log("Updating")
    console.log(await song.update({ lyrics: lyrics }))
    logger.info("Added Lyrics to " + song.title + " with length " + lyrics.length)
    return song.toJSON();


  },
  { connection },
);

const aiAnalysisQueue = new Worker('aiAnalysis', async job => {
  logger.info("AI Analysis got Job: " + job.data)
  if (job.data.type = "addFromSongId") {
    var song = await database.Song.findByPk(job.data.id)
    if (song?.lyrics == null) {
      return new Error("Song has no lyrics");
    }
    var rating = await aiConnector.rateLyrics(song.lyrics);
    logger.info(rating)
    var addedSets = await aiConnector.addRatingToDb(rating, song.id);
    logger.info(addedSets)
    return {
      record: song.toJSON(),
      notice: {
        message: JSON.stringify({ analysis: rating, addedDatasets: addedSets }),
        type: 'success'
      }

    }

  }

}, { connection })