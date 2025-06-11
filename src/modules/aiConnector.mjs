import axios, { isCancel, AxiosError } from 'axios';
import 'dotenv/config'
import Genius from 'genius-lyrics';
import * as database from './database.mjs'
import * as html from 'node-html-parser'
import OpenAI from 'openai'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as fs from 'node:fs/promises'

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

export async function rateLyrics(lyrics) {
    console.log(lyrics)
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
    console.log(response.output_parsed);
    return response.output_parsed;
}

export async function addRatingToDb(ratings, songId) {
    try {
    for (const element of ratings.substances) {
        element.songId = songId
        element.sysPromptVer = sysPromptVer
        let subst = await database.substanceRating.create(element)
        console.log ("Added", subst)
    };
} catch (e) {
    database.fixSequelizeError(e)
}
}