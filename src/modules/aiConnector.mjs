/**
 * Functions that interact with the OpenAI API to analyse lyrics and persist
 * the results in the database.
 * @module aiConnector
 */
import axios, { isCancel, AxiosError } from 'axios';
import 'dotenv/config'
import Genius from 'genius-lyrics';
import * as database from './database.mjs'
import * as html from 'node-html-parser'
import OpenAI from 'openai'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as fs from 'node:fs/promises'
import loggerConstructor from './logger.mjs'
const logger = loggerConstructor()

/**
 * @typedef {Object} SongAnalysis
 * @property {string} substance Name of the detected substance
 * @property {number} wortwahl Word choice score
 * @property {number} perspektive Perspective score
 * @property {number} kontext Context score
 * @property {number} hauefigkeit Frequency score
 * @property {number} [songId] Related song ID
 * @property {number} [sysPromptVer] Version of the system prompt
 */

/**
 * @typedef {Object} Substances
 * @property {SongAnalysis[]} substances Array of analyses returned from the AI
 */


const systemPrompt = await fs.readFile("./systemprompt.txt", "utf8");
const sysPromptVer = 1
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

export const songAnalysisSchema = z.object(
    {
        substance: z.string(),
        wortwahl: z.number(),
        perspektive: z.number(),
        kontext: z.number(),
        hauefigkeit: z.number()

    }
)
export const substancesSchema = z.object({"substances": z.array(songAnalysisSchema)});

/**
 * Send lyrics to OpenAI and return the parsed rating.
 * @param {string} lyrics Text to analyse
 * @returns {Promise<Substances>} Parsed result from the AI
 */
export async function rateLyrics(lyrics) {
    logger.info(lyrics)
    const response = await openai.responses.parse({
        model: "gpt-4o",
        input: [
            {
                role: "system",
                content: systemPrompt,
            },
            { role: "user", content: lyrics },
        ],
        text: {
            format: zodTextFormat(substancesSchema, "substance_rating_schema"),
        },
    });
    logger.info(response.output_parsed);
    return response.output_parsed;
}

/**
 * Store rating objects in the database.
 * @param {Substances} ratings Result from {@link rateLyrics}
 * @param {number} songId ID of the song to associate
 * @returns {Promise<void>}
 */
export async function addRatingToDb(ratings, songId) {
    try {
    for (const element of ratings.substances) {
        element.songId = songId
        element.sysPromptVer = sysPromptVer
        let subst = await database.substanceRating.create(element)
        logger.info ("Added", subst)
    };
} catch (e) {
    database.fixSequelizeError(e)
}
}