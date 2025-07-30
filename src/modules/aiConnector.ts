
/**
 * Functions that interact with the OpenAI API to analyse lyrics and persist
 * the results in the database.
 * @module aiConnector
 */
import type { InferCreationAttributes } from 'sequelize';
import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
import OpenAI from 'openai'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as fs from 'node:fs/promises'
import { geniusFetcher, lyricsFetcher, database, logger as loggerConstructor } from './index'
import { Point } from '@influxdata/influxdb3-client';
const logger = await loggerConstructor.logger();
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
// These two fields are added before .create()
export const substancesSchema: z.AnyZodObject = z.object({"substances": z.array(songAnalysisSchema)});
type substancesSchema = {
    substances: Array<
    InferCreationAttributes<database.SubstanceRating> & {
      songId?: number;
      sysPromptVer?: number;
    }
  >;
}
/**
 * Send lyrics to OpenAI and return the parsed rating.
 * @param {string} lyrics Text to analyse
 * @returns {Promise<Substances>} Parsed result from the AI
 */
export async function rateLyrics(lyrics: string) {
    const startTime = Date.now()
    try {
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
    const p = Point.measurement("aiAnalysis").setTag('sysPromptVer', String(sysPromptVer)).setStringField("model", "gpt-4o")
        .setIntegerField("inputTokens", response.usage?.input_tokens)
        .setIntegerField('outputTokens', response.usage?.output_tokens)
        .setIntegerField('totalTokens', response.usage?.total_tokens)
        .setTimestamp(new Date())
    await loggerConstructor.writeInflux([p])
    logger.info(response.output_parsed);
    return response.output_parsed as substancesSchema;
} catch (e) {
    throw e;
} finally {
    loggerConstructor.exportTaskTime("aiAnalysis", (Date.now() - startTime))

}
}

/**
 * Store rating objects in the database.
 * @param {Substances} ratings Result from {@link rateLyrics}
 * @param {number} songId ID of the song to associate
 * @returns {Promise<void>}
 */
export async function addRatingToDb(ratings: substancesSchema, songId: number) {
    const startTime = Date.now()
    try {
    for (const element of ratings.substances) {
        element.songId = songId
        element.sysPromptVer = sysPromptVer
        let subst = await database.SubstanceRating.create(element)
        logger.info ("Added", subst)
    };
} catch (e) {
    database.fixSequelizeError(e)
} finally {
    loggerConstructor.exportTaskTime("addRatingToDb", (Date.now() - startTime))

}
}