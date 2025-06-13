import axios, { isCancel, AxiosError } from 'axios';
import 'dotenv/config'
import { parse as htmlParser } from 'node-html-parser'
import * as fs from 'node:fs';

var logger = null
export function setLogger(loggerIn) {
    logger = loggerIn;
}



async function getHTML(url) {

    let content = await axios.get(url)
    fs.writeFileSync("htmlout.html", content.data)
    return content
}
export class NoResultError extends Error {
    constructor() {
        super(null)
    }
}

async function parseHTML(html) {
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
}

export async function lyricsFromURL(url) {
    try {
        let html = await getHTML(url)
        let lyrics = await parseHTML(html.data)
        return lyrics;
    } catch (e) {
        return e
    }


}