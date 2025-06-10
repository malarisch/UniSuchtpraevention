import {ComponentLoader, AdminJS} from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import * as AdminJSSequelize from '@adminjs/sequelize'

import express from 'express'
import 'dotenv/config'
import * as database from './modules/database.mjs'
import * as GeniusTool from './admin/GeniusToolPage.mjs'
import {componentLoader, Components } from './admin/components.mjs'
import * as UserResources from './admin/resources.mjs';

const PORT = process.env.PORT

AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
})



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

    app.listen(PORT, () => {
        console.log(`AdminJS started on http://localhost:${PORT}${admin.options.rootPath}`)
    })
}

start()