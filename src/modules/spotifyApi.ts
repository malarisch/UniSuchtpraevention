import {Client as spotifyAPIClient} from "spotify-api.js";
import 'dotenv/config'


// More simpler code with asynchronous operations:
export const client = await spotifyAPIClient.create({ token: { clientID: process.env.SPOTIFY_CLIENT_ID??'', clientSecret: process.env.SPOTIFY_CLIENT_SECRET??'' } });
