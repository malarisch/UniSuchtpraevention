import 'dotenv/config'
import loggerConstructor from '../modules/logger.mjs'
const logger = loggerConstructor()

import * as GeniusFetcher from '../modules/geniusFetcher.mjs'
import { componentLoader, Components } from './components.mjs'

export async function testGenius(inputText) {
  let result = await GeniusFetcher.GeniusClient.songs.search(inputText)
  return (result)
}


export const page = {
  label: 'GeniusTool',
  component: Components.GeniusTool,
  handler: async (request, response, context) => {
   
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
    }
  }
}

export default page;