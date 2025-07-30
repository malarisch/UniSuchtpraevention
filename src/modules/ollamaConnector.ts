import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
import {logger as loggerConstructor} from '@suchtModules/index'
import fs from 'fs/promises'
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Point } from '@influxdata/influxdb3-client';
const checkSearchResultSchema = z.object({
    index: z.number().describe("The index of the correct search result"),
    isFirst: z.boolean().describe("Is it the 0 index? Sainity Check"),
    isNone: z.boolean().describe("is true if none of the search results match")
})


const logger = await loggerConstructor.logger()

import {Ollama} from 'ollama'
export const ollamaCheckSearchResult = new Ollama({host: process.env.OLLAMA_HOST})
export const ollamaCheckSearchResultSysPrompt: string = await fs.readFile("./src/prompts/verifySongSearch.txt", "utf8")

export async function checkSearch(inputSearchQuery: any, inputGeniusResult: any) {
    const jsonSchema = zodToJsonSchema(checkSearchResultSchema);
    
    var foundSongs = "INPUT: " + inputSearchQuery + "\n\n\n"
    for (var i in inputGeniusResult) {
        
        var artistName = inputGeniusResult[i].result.artist_names
        var songTitle = inputGeniusResult[i].result.title
        foundSongs += "["+ i + "] " + artistName + " - " + songTitle + "\n"
    }
    
    const messages = [
        {
            role: "system",
            content: ollamaCheckSearchResultSysPrompt
        },
        {
            role: "user",
            content: foundSongs
        }
    ]
    const response = await ollamaCheckSearchResult.chat({
        model: process.env.OLLAMA_MODEL ?? "",
        messages: messages,
        format: jsonSchema,
        options: {
            temperature: 0
        }
    })
    
    const p = Point.measurement("checkSearch").setTag('model', process.env.OLLAMA_MODEL ?? "ollama").setStringField("query", inputSearchQuery)
        .setIntegerField("total_duration", response.total_duration/1000000)
        .setIntegerField('load_duration', response.load_duration/1000000)
        .setIntegerField('prompt_eval_duration', response.prompt_eval_duration/1000000)
        .setIntegerField('eval_duration', response.eval_duration/1000000).
        setIntegerField("inputTokens", response.prompt_eval_count)
        .setIntegerField('outputTokens', response.eval_count)
        .setIntegerField('totalTokens', response.eval_count + response.prompt_eval_count)
        .setTimestamp(new Date())
    
    try {
        
        const searchResponse = checkSearchResultSchema.parse(JSON.parse(response.message.content))
        logger.info("Result for Search Request "+ inputSearchQuery + ": Index " + searchResponse.index + " isFirst: "+ searchResponse.isFirst)
        if (searchResponse.isFirst && searchResponse.index !== 0) {
            logger.error(new Error("isFirst but not index 0"))
            p.setBooleanField("error", true)
            throw new Error("isFirst != index== 0")

        }
        p.setBooleanField("isFirst", searchResponse.isFirst).setIntegerField("index", searchResponse.index).setBooleanField("error", false)

        return searchResponse
    } catch (e) {
        p.setBooleanField("error", true)
        logger.error(e)
        throw e
    } finally {
        
        await loggerConstructor.writeInflux([p])
    }
    
}