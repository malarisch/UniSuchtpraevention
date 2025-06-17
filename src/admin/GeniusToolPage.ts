import 'dotenv/config'
import {logger as loggerConstructor} from '../modules/logger'

import {Queues} from '../modules/index'

const logger = await loggerConstructor()

import * as GeniusFetcher from '../modules/geniusFetcher'
import { componentLoader, Components } from './components'

export async function testGenius(inputText: string) {
  let result = await GeniusFetcher.GeniusClient.songs.search(inputText)
  return (result)
}


export const page = {
  label: 'GeniusTool',
  component: Components.GeniusTool,
  handler: async (request: any, response: any, context: any) => {
   
    logger.info("Got Input:", request.payload)
    if (request.payload.type == "search") {
      const result = await GeniusFetcher.searchSong(request.payload.searchString)
      return { type: "search", message: result }  
    } else if (request.payload.type == "findOrCreate") {
      
      return {
        type: "findOrCreate",
        message: await GeniusFetcher.addSongAndArtistToDatabase(
          await GeniusFetcher.getSong(request.payload.songId)
        )
      }
    } else if (request.payload.type == "startChain") {
        let job = await Queues.QueueList.songFetcherQueue.add(Queues.songFetcherQueueName, {
          songId: request.payload.songId,
          chain: true
        })
        logger.info("Created Job " + job.id + " for geniusID: " + request.payload.songId)
        return {
          type: "startChain",
          message: "Started Job: " + job.id,
          job: JSON.stringify(job)
        }
    }
  }
}

export default page;