import axios, { isCancel, AxiosError } from 'axios';
import 'dotenv/config'
import Genius from 'genius-lyrics';
import * as database from './database.mjs'
import * as html from 'node-html-parser'
import loggerConstructor from './logger.mjs'
const logger = loggerConstructor()


const axiosInstance = axios.create({
    baseURL: "https://api.genius.com",
    headers: { "Authorization": "Bearer " + process.env.GENIUS_CLIENT_ACCESS_TOKEN }
})


export const GeniusClient = new Genius.Client(process.env.GENIUS_CLIENT_ACCESS_TOKEN)

export async function searchSong(songName) {
    logger.info("Searching Song: ", songName)
    let searchRequest = await axiosInstance.get("/search", {
        params: {
            "q": songName
        }
    });
    logger.info("Found %d hits", searchRequest.data.response.hits.length)
    return searchRequest.data.response.hits
}
export async function getSong(id) {
    let song = await axiosInstance.get("/songs/" + id, {
        params: {
            text_format: "plain"
        }
    })
    return song.data.response.song;
}
export async function addSongAndArtistToDatabase(params) {
    try {
        let [Song, songCreated] = await database.Song.findOrCreate({
            where: { geniusId: params.id },
            defaults: {
                "title": params.title,
                releaseDate: Date.parse(params.release_date_for_display),
                lyricsState: params.lyrics_state,
                geniusId: params.id,
                geniusURL: params.url,
                meta: params


            }
        })
        async function findCreateArtist(artist) {
            return await database.Artist.findOrCreate({
                where: {
                    geniusId: artist.id
                },
                defaults: {
                    name: artist.name,
                    geniusId: artist.id,
                    geniusURL: artist.url,
                    meta: artist
                },
                include: database.Song
            })
        }
        var artists = []
        /*var [primaryArtistCreated, primaryArtist] = await findCreateArtist(params.primary_artist)
        if (primaryArtistCreated) await primaryArtist.addSong(Song);*/





        for (var i in params.primary_artists) {
            let [artist, createdA] = await findCreateArtist(params.primary_artists[i])
            if (createdA || !await artist.hasSong(Song)) {
                logger.info(await artist.addSong(Song, { through: { isPrimaryArtist: true } }))
            }
            artists.push({
                wasCreated: createdA,
                artist: artist
            });
        }
        for (var i in params.featured_artists) {
            let [artist, createdB] = await findCreateArtist(params.featured_artists[i])
            if (createdB || !await artist.hasSong(Song)) {
                try {
                    logger.info(await artist.addSong(Song, { through: { isPrimaryArtist: false } }))
                } catch (e) {
                    database.fixSequelizeError(e)
                }

            }
            artists.push({
                wasCreated: createdB,
                artist: artist
            });
        }
        var album = null;
        if (params.album != null) {
            var [album, albumCreated] = await database.Album.findOrCreate({
                where: { geniusId: params.album.id },
                defaults: {
                    geniusId: params.album.id,
                    title: params.album.name,
                    releaseDate: Date.parse(params.album.release_date_for_display),
                    geniusURL: params.album.url,
                    meta: params
                }
            })

            for (var i in params.album.primary_artists) {
                let [artist, createdA] = await findCreateArtist(params.album.primary_artists[i])
                if (createdA || !await artist.hasAlbum(album)) {
                    try {
                        logger.info(await artist.addAlbum(album, { through: { isPrimaryArtist: false } }))
                    } catch (e) {
                        database.fixSequelizeError(e)
                    }
                }
            }
            for (var i in params.album.featured_artists) {
                let [artist, createdB] = await findCreateArtist(params.album.featured_artists[i])
                if (createdB || !await artist.hasAlbum(album)) {
                    try {
                        logger.info(await artist.addAlbum(album, { through: { isPrimaryArtist: false } }))
                    } catch (e) {
                        database.fixSequelizeError(e)
                    }

                }
            }
            if (!await album.hasSong(Song)) {
                await album.addSong(Song)
            }
        }

        return {
            song: await database.Song.findByPk(Song.id, { include: database.Artist }),
            songWasCreated: songCreated,
            artists: artists,
            originalParams: params,
            album: (params.album == null ? null : album),
            albumWasCreated: albumCreated
        };
    } catch (e) {
        database.fixSequelizeError(e)
    }

}


export default GeniusClient