
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




const systemPrompt = await fs.readFile("./src/prompts/substanceAnalysis.txt", "utf8");
const jsonSchemaOpenAI = JSON.parse(await fs.readFile("./src/prompts/substanceAnalysis.schema.json", "utf8"))
const sysPromptVer = 2
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
    logger: logger.child({ name: "openai" }),
});

export const songAnalysisSchema = z.object(
    {
        substanceCategory: z.enum([
            "Alkohol",
            "Cannabinoide",
            "Stimulanzien",
            "Opioide",
            "Sedativa",
            "Halluzinogene",
            "Dissoziativa",
            "Sonstiges"
        ]),
        substances: z.array(z.string()).min(1),
        wording: z.number().min(-2).max(2),
        perspective: z.number().min(-2).max(2),
        context: z.number().min(-2).max(2),
        glamorization: z.number().min(-2).max(2),
        harmAcknowledgement: z.number().min(-2).max(0),
        justification: z.string()


    }
)
// These two fields are added before .create()
export const substancesSchema: z.AnyZodObject = z.object({"substances": z.array(songAnalysisSchema)});
type substancesSchema = {
    substances: Array<
    InferCreationAttributes<database.SubstanceRating> & {
      songId?: number;
      sysPromptVer?: number;
      model?: string;
    }
  >;
}
const model = "o4-mini"
/**
 * Send lyrics to OpenAI and return the parsed rating.
 * @param {string} lyrics Text to analyse
 * @returns {Promise<Substances>} Parsed result from the AI
 */
export async function rateLyrics(lyrics: string): Promise<substancesSchema> {

    const startTime = Date.now()
    try {
    const response = await openai.responses.parse({
        model: model,

        input: [
            { role: "user", content: lyrics },

        ],
        reasoning: {
            effort: "medium",
            summary: null
        },
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
    return response.output_parsed as unknown as substancesSchema;
} catch (e) {
    throw e;
} finally {
    await loggerConstructor.exportTaskTime("aiAnalysis", (Date.now() - startTime))

}
}

/**
 * Store rating objects in the database.
 * @param {Substances} ratings Result from {@link rateLyrics}
 * @param {number} songId ID of the song to associate
 * @returns {Promise<void>}
 */
export async function addRatingToDb(ratings: substancesSchema, songId: number): Promise<void> {
    const startTime = Date.now()
    try {
    for (let element of ratings.substances) {
        element.songId = songId
        element.sysPromptVer = sysPromptVer
        element.model = model
        let subst = await database.SubstanceRating.create(element)
        logger.info ("Added", subst)
    };
} catch (e) {
    database.fixSequelizeError(e)
} finally {
    loggerConstructor.exportTaskTime("addRatingToDb", (Date.now() - startTime))

}
}