/**
 * Utilities for interacting with the Genius API and persisting songs,
 * artists and albums in the database.
 * @module geniusFetcher
 */
import axios from 'axios';
import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
import Genius, { ArtistsClient } from 'genius-lyrics';
import { geniusFetcher, lyricsFetcher, database, logger as loggerConstructor } from './index'
import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Album, Artist } from '@suchtModules/database';

const logger = await loggerConstructor.logger()


const axiosInstance = axios.create({
    baseURL: "https://api.genius.com",
    headers: { "Authorization": "Bearer " + process.env.GENIUS_CLIENT_ACCESS_TOKEN }
})


export const GeniusClient = new Genius.Client(process.env.GENIUS_CLIENT_ACCESS_TOKEN)

/**
 * Search the Genius API for songs matching the given name.
 * @param {string} songName
 * @returns {Promise<any[]>} Array of search hits from Genius
 */
export async function searchSong(songName: string) {
    const startTime = Date.now()
    logger.info("Searching Song: " + songName)
    let searchRequest = await axiosInstance.get("/search", {
        params: {
            "q": songName
        }
    });
    logger.info("Found %d hits", searchRequest.data.response.hits.length)
    const duration = (Date.now() - startTime)
    loggerConstructor.exportTaskTime("searchSong", duration)
    return searchRequest.data.response.hits
}
/**
 * Retrieve a single song from the Genius API by its ID.
 * @param {number} id
 * @returns {Promise<any>} Song details
 */
export async function getSong(id: number | string) {
    logger.info("Loading Song from Genius: " + id)
    const startTime = Date.now()
    if (typeof id == "number") {
        id = String(id)
    }
    let song = await axiosInstance.get("/songs/" + id, {
        params: {
            text_format: "plain"
        }
    })
    loggerConstructor.exportTaskTime("getSong", (Date.now() - startTime))
    return song.data.response.song;
}
/**
 * Create or update song, artist and album entries in the database based on
 * a Genius API song object.
 * @param {any} params Song object returned by Genius
 * @returns {Promise<object|undefined>} Details about created records
 */
export async function addSongAndArtistToDatabase(params: any) {
    const startTime = Date.now()
    try {
        let DateObj: Date = new Date(params.release_date_for_display)

        let [Song, songCreated] = await database.Song.findOrCreate({
            where: { geniusId: params.id },
            defaults: {
                "title": params.title,
                releaseDate: DateObj,
                lyricsState: params.lyrics_state,
                geniusId: params.id,
                geniusURL: params.url,
                meta: params,
                lang: params.language


            }
        })
        async function findCreateArtist(artistVal: any): Promise<ArtistArray> {
            
            var [artist, wasCreated] = await database.Artist.findOrCreate({
                where: {
                    geniusId: artistVal.id
                },
                defaults: {
                    name: artistVal.name,
                    geniusId: artistVal.id,
                    geniusURL: artistVal.url,
                    meta: artistVal
                } as InferCreationAttributes<Artist>,
                include: database.Song
            })
            if (typeof artist === "boolean") {
                throw new Error("Artist was somehow bool - Database corrupt?")
            } else {
                return {
                    wasCreated: wasCreated,
                    artist: artist
                }
            }
        }
        interface ArtistArray {
            wasCreated: boolean,
            artist: Artist
        }
        var artists: Array<ArtistArray> = []
        /*var [primaryArtistCreated, primaryArtist] = await findCreateArtist(params.primary_artist)
        if (primaryArtistCreated) await primaryArtist.addSong(Song);*/





        for (var i in params.primary_artists) {
            var result = await findCreateArtist(params.primary_artists[i])
            if (result.wasCreated || !await result.artist.hasSong(Song)) {
                await result.artist.addSong(Song, { through: { isPrimaryArtist: true } } as any)
                logger.info("Added Song " + Song.title + " to Primary Artist "+result.artist.name)
            }
            artists.push(result);
        }
        for (var i in params.featured_artists) {
            let result = await findCreateArtist(params.featured_artists[i])
            if (result.wasCreated || !await result.artist.hasSong(Song)) {
                try {
                    await result.artist.addSong(Song, { through: { isPrimaryArtist: false } } as any)
                    logger.info("Added Song " + Song.title + " to Featured Artist "+result.artist.name)
                } catch (e) {
                    database.fixSequelizeError(e)
                }

            }
            artists.push(result);
        }
        var album: Album | null = null; 
        var albumCreated: boolean = false
        if (params.album != null) {
            [album,  albumCreated] = await database.Album.findOrCreate({
                where: { geniusId: params.album.id },
                defaults: {
                    geniusId: params.album.id,
                    title: params.album.name,
                    releaseDate: new Date(params.album.release_date_for_display),
                    geniusURL: params.album.url,
                    meta: params
                }
            })

            for (var i in params.album.primary_artists) {
                

                var result = await findCreateArtist(params.album.primary_artists[i])
                if (result.wasCreated || !(await result.artist.hasAlbum(album))) {
                    try {
                        logger.debug(await result.artist.addAlbum(album, { through: { isPrimaryArtist: false } } as any))
                        logger.info("Added Album " + album.title + " to Primary Artist "+result.artist.name)
                    } catch (e) {
                        database.fixSequelizeError(e)
                    }
                }
            }
            for (var i in params.album.featured_artists) {
                let result = await findCreateArtist(params.album.featured_artists[i])
                if (result.wasCreated || !await result.artist.hasAlbum(album)) {
                    try {
                        logger.debug(await result.artist.addAlbum(album, { through: { isPrimaryArtist: false } } as any))
                        logger.info("Added Album " + album.title + " to Featured Artist "+result.artist.name)
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
    } finally {
        loggerConstructor.exportTaskTime("addSongAndArtistToDatabase", (Date.now() - startTime))

    }

}


export default GeniusClient