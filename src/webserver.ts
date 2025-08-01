/**
 * Entry point for the Express based AdminJS dashboard.
 * Sets up all routes and starts the HTTP server.
 */
import {ComponentLoader, AdminJS} from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import * as AdminJSSequelize from '@adminjs/sequelize'

import Arena from 'bull-arena';
import { Queue, FlowProducer } from "bullmq";
import express from 'express';
import 'dotenv/config'
import { geniusFetcher, lyricsFetcher, database, logger as loggerConstructor } from '@suchtModules/index'

import * as GeniusTool from './admin/GeniusToolPage' 
import * as ArenaTool from "./admin/ArenaToolPage"

import {componentLoader, Components } from './admin/components'

import * as UserResources from './admin/resources';

const logger = await loggerConstructor.logger()
logger.debug("Script loaded")

const PORT = process.env.PORT

AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
})

const arena = Arena({
    //@ts-ignore
  BullMQ: Queue,
  FlowBullMQ: FlowProducer,
    queues: [
        {
            type: "bullmq",
            name: "lyricsFetcher",
            hostId: "Webapp",
            redis: {host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT as string)}

        },
        {
            type: "bullmq",
            name: "songFetcher",
            hostId: "Webapp",
            redis: {host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT as string)}
        },
        {
            type: "bullmq",
            name: "aiAnalysis",
            hostId: "Webapp",
            redis: {host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT as string)}
        }
    ]
})

/**
 * Initialise database connection and launch the admin dashboard server.
 * @returns {Promise<void>}
 */
const start = async (): Promise<void> => {
    const app = express()
    await database.sync()
    const admin = new AdminJS({
        resources: [database.Album, database.Artist, UserResources.SongsResource, database.SubstanceRating, database.Substance, database.SubstanceCategory],
        componentLoader,
        pages: {
            GeniusTool: GeniusTool.page,
            Arena: ArenaTool.page

        }
    })


    admin.watch()
    const adminRouter = AdminJSExpress.buildRouter(admin)
    app.use(admin.options.rootPath, adminRouter)
    app.use("/arena", arena)
    app.listen(PORT, () => {
        logger.info(`AdminJS started on http://localhost:${PORT}${admin.options.rootPath}`)
    })
}

start()