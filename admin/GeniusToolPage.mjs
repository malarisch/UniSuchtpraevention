import 'dotenv/config'


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
    const { input } = request.payload || {}

    if (!input) {
      return { message: 'Kein Text eingegeben.' }
    }
    if (input.type == "search") {
      const result = await GeniusFetcher.searchSong(input.searchString)
      return { message: result }  
    } else if (input.type == "findOrCreate") {
      //TODO
    }
  }
}

export default page;