/**
 * Background worker processing BullMQ jobs for fetching songs and lyrics.
 */

import { Worker, Job, Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import 'dotenv/config'
import { geniusFetcher, lyricsFetcher, database, aiConnector, Queues, logger as loggerConstructor, ollamaConnector } from '@suchtModules/index'
import { InferAttributes, InferCreationAttributes } from 'sequelize';

const logger = await loggerConstructor.logger()
logger.debug("Worker Script loaded")

database.sync()



const songFetcherQueue = new Worker(
  'songFetcher',
  async job => {
    const startTime = Date.now()
    const chain = job.data.chain ?? false
    const chainAiAnalysis = job.data.chainAiAnalysis ?? false
    
    logger.info("songFetcher got Job: " + job.name)


    if (job.data.songId == undefined) {
      if (job.data.searchString == undefined) {
        let err = new Error("SongFetcherWorker: No Data Supplied")
        logger.error(err)
        throw err
      } else {
        job.data.searchString = job.data.searchString.replace(/[\[][a-zA-Z]*[\]]/ig, "")
        let searchResult = await geniusFetcher.searchSong(job.data.searchString)
        if (searchResult.length == 0) {
          let err = new Error("No Search Results for " + job.data.searchString.replace(/[\[][a-zA-Z]*[\]]/ig, ""))
          logger.error(err)
          throw err
          return
        }
        const sanityCheck = await ollamaConnector.checkSearch(job.data.searchString.replace(/[\[][a-zA-Z]*[\]]/ig, ""), searchResult)
        if (sanityCheck?.isNone) {
          let err = new Error ("No Searchs Results match for " +  + job.data.searchString.replace(/[\[][a-zA-Z]*[\]]/ig, ""))
          throw err
        }
        await job.updateData({ songId: searchResult[sanityCheck?.index ?? 0].result.id })
      }
    }
    const songAddResult = await geniusFetcher.addSongAndArtistToDatabase(await geniusFetcher.getSong(job.data.songId))
    if (chain) {
      if (!songAddResult?.song?.lyrics) {
        await Queues.QueueList.lyricsFetcherQueue.add(job.name, {
          chain: true,
          internalId: songAddResult?.song?.id,
          chainAiAnalysis: chainAiAnalysis
        })
        logger.info("Chained Job for lyricsFetcher for Song " + songAddResult?.song?.id + "("+songAddResult?.song?.title+")")
      }
      
    }
    return songAddResult

  },
  { connection: Queues.redisConnection, limiter: {
    duration: 1000,
    max: 2
  } },
);


/**
 * Starts Worker to process the queue to fetch the lyrics
 */
const lyricsFetcherQueue = new Worker(
  'lyricsFetcher',
  async job => {
    const chain = job.data.chain ?? false;
    
    const chainAiAnalysis = job.data.chainAiAnalysis ?? false
    let song: database.Song
    logger.info("lyricsFetcher got Job: " + job.name + " (" + job.id + ")")
    if (job.data.url == undefined && job.data.geniusId != undefined) {
      await job.updateData(await geniusFetcher.getSong(job.data.geniusId))
      song = await database.Song.findOne({ where: { "geniusId": job.data.geniusId } }) as database.Song
      await job.updateData(song)
    } else if (job.data.internalId != undefined) {
      song = await database.Song.findByPk(job.data.internalId) as database.Song
      await job.updateData(song)
    } else if (job.data.url != undefined) {
      song = await database.Song.findOne({ where: { "geniusURL": job.data.url } }) as database.Song
      await job.updateData(song)
    } else {
      throw new Error("No Song Data supplied")
      return null
      
    }
    let lyrics = await lyricsFetcher.lyricsFromURL(job.data.geniusURL)
    
    await song.update({ lyrics: lyrics })
    logger.info("Added Lyrics to " + song.title + " with length " + lyrics.length)
    if (chain && lyrics.length > 0 && chainAiAnalysis) {
        await Queues.QueueList.aiAnalysisQueue.add(job.name, {
          internalId: song.id
        })
        logger.info("Chained Job for aiAnalysis for Song " + song.id + "("+song.title+")")
    }
    return song.toJSON();


  },
  { connection: Queues.redisConnection, limiter: {
    duration: 2000,
    max: 1
  } },
);

const aiAnalysisQueue = new Worker('aiAnalysis', async job => {
  const chain = job.data.chain ?? false;
  logger.info("AI Analysis got Job " + job.id + " for id " + job.data.internalId);
  
    var song = await database.Song.findByPk(job.data.internalId)
    if (song?.lyrics == null) {
      return new Error("Song has no lyrics");
    }
    var rating = await aiConnector.rateLyrics(song.lyrics);
    logger.info(rating)
    var addedSets = await aiConnector.addRatingToDb(rating, song.id);
    logger.info(addedSets)
    if (chain) {
      logger.info("Chain Done!")
    }
    return {
      record: song.toJSON(),
      notice: {
        message: JSON.stringify({ analysis: rating, addedDatasets: addedSets }),
        type: 'success'
      }

    }

  

}, { connection: Queues.redisConnection })