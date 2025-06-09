import axios, { isCancel, AxiosError } from 'axios';
import 'dotenv/config'
import Genius from 'genius-lyrics';
import * as database from './database.mjs'

const axiosInstance = axios.create({
    baseURL: "https://api.genius.com",
    headers: { "Authorization": "Bearer " + process.env.GENIUS_CLIENT_ACCESS_TOKEN }
})


export const GeniusClient = new Genius.Client(process.env.GENIUS_CLIENT_ACCESS_TOKEN)

export async function searchSong(songName) {
    let searchRequest = await axiosInstance.get("/search", {
        params: {
            "q": songName
        }
    });
    return searchRequest.data.response.hits
}

export async function addSongAndArtistToDatabase(params) {
    let [songCreated, Song] = await database.Song.findOrCreate({
        where: { geniusId: params.id },
        defaults: {
            "title": params.title,
            year: params.release_date_components,
            lyricsState: params.lyrics_state,
            geniusId: params.id,


        }
    })
    async function findCreateArtist(artist) {
        return await database.Artist.findOrCreate({
            where: {
                geniusId: artist.id
            },
            defaults: {
                name: artist.name,
                geniusId: artist.id
            },
            include: database.Song
        })
    }

    var [primaryArtistCreated, primaryArtist] = await findCreateArtist(params.primary_artist)
    if (primaryArtistCreated) await primaryArtist.addSong(Song);


    for (var i in params.featured_artists) {
        let [createdB, artist] = await findCreateArtist(params.featured_artists[i])
        if (createdB || !artist.hasSong(Song)) {
            await artist.addSong(Song)
        }
    }


    for (var i in params.primary_artists) {
        let [createdA, artist] = await findCreateArtist(params.primary_artists[i])
        if (createdA || !artist.hasSong(Song)) {
            await artist.addSong(Song)
        }
    }
    return await database.Song.findByPk(Song.id);
}

export default GeniusClient