/**
 * Entry point for the Express based AdminJS dashboard.
 * Sets up all routes and starts the HTTP server.
 */
import {ComponentLoader, AdminJS} from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import * as AdminJSSequelize from '@adminjs/sequelize'

import Arena from 'bull-arena';
import { Queue, FlowProducer } from "bullmq";
import express from 'express'
import 'dotenv/config'
import * as database from './modules/database.mjs'
import * as GeniusTool from './admin/GeniusToolPage.mjs'
import {componentLoader, Components } from './admin/components.mjs'
import * as UserResources from './admin/resources.mjs';
import loggerConstructor from './modules/logger.mjs'
const logger = loggerConstructor()
logger.debug("Script loaded")

const PORT = process.env.PORT

AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
})

const arena = Arena({
  BullMQ: Queue,
  FlowBullMQ: FlowProducer,
    queues: [
        {
            type: "bullmq",
            name: "lyricsFetcher",
            hostId: "Webapp",
            redis: {host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}

        },
        {
            type: "bullmq",
            name: "songFetcher",
            hostId: "Webapp",
            redis: {host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}
        }
    ]
})

/**
 * Initialise database connection and launch the admin dashboard server.
 * @returns {Promise<void>}
 */
const start = async () => {
    const app = express()
    await database.sync()
    const admin = new AdminJS({
        resources: [database.Album, database.Artist, UserResources.SongsResource, database.substanceRating],
        componentLoader,
        pages: {
            GeniusTool: GeniusTool.page
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