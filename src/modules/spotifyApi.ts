import {Client as spotifyAPIClient} from "spotify-api.js";
import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});

// More simpler code with asynchronous operations:
export const client = await spotifyAPIClient.create({ token: { clientID: process.env.SPOTIFY_CLIENT_ID??'', clientSecret: process.env.SPOTIFY_CLIENT_SECRET??'' } });
