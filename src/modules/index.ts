import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});

export * as aiConnector from '@suchtModules/aiConnector'

export * as database from '@suchtModules/database'
export * as logger from '@suchtModules/logger'

export * as geniusFetcher from '@suchtModules/geniusFetcher'

export * as lyricsFetcher from '@suchtModules/lyricsFetcher'
export * as Queues from '@suchtModules/queues'
export * as ollamaConnector from '@suchtModules/ollamaConnector'
export * as substanceTagger from '@suchtModules/substanceTagger'
//export * as spotifyApi from '@suchtModules/spotifyApi'