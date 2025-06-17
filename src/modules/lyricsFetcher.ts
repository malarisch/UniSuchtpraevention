/**
 * Helper functions for retrieving lyrics from Genius URLs.
 * @module lyricsFetcher
 */
import axios from 'axios';
import 'dotenv/config'
import { parse as htmlParser } from 'node-html-parser'
import { lyricsFetcher, database, logger as loggerConstructor } from './index'
const logger = await loggerConstructor.logger()
/**
 * Download the HTML content of the given URL.
 * @param {string} url
 * @returns {Promise<import("axios").AxiosResponse>}
 */



async function getHTML(url: string) {
    const startTime = Date.now()
    logger.info("Fetching "+url)
    try {

    let content = await axios.get(url)
    return content
    } finally {
        loggerConstructor.exportTaskTime("getHTML", (Date.now() - startTime))

    }
}
export class NoResultError extends Error {
    constructor() {
        super(undefined)
    }
}

/**
 * Extract raw lyrics text from Genius HTML markup.
 * @param {string} html
 * @returns {string}
 * @throws {NoResultError} if no lyrics are present in the markup
 */
async function parseHTML(html: string) {
    const startTime = Date.now()
    try {
    let document = htmlParser(html)
    const lyricsRoot = document.getElementById("lyrics-root")
    
    //fs.writeFileSync("htmlout.html", document)
    const lyrics = lyricsRoot
        ?.querySelectorAll("[data-lyrics-container='true']")
        .map((container) => {
            // Entferne alle <div>-Elemente (die z.B. Performer-Infos enthalten)
            container.querySelectorAll("div").forEach((div) => div.remove());

            // Ersetze <br> mit echten Zeilenumbrüchen
            container.querySelectorAll("br").forEach((br) => {
                br.replaceWith(new htmlParser.TextNode("\r\n"));
            });

            return container.text.trim();
        })
        .join("\n")
        .trim();

    if (!lyrics?.length) {
        throw new NoResultError();
    }
    return lyrics
} catch (e) {
    logger.error(e)
    throw e
} finally {
    loggerConstructor.exportTaskTime("parseHTML", (Date.now() - startTime))

}
}

/**
 * Convenience wrapper that fetches a page and parses the lyrics.
 * @param {string} url
 * @returns {Promise<string|Error>} Lyrics string or error
 */
export async function lyricsFromURL(url: string): Promise<string> {
    try {
        let html = await getHTML(url)
        let lyrics = await parseHTML(html.data)
        return lyrics;
    } catch (e: any) {
        return e.message
    }


}
