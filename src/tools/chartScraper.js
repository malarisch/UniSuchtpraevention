import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from "node:fs/promises"

const getSongs = async (url) => {
    try {
        try {
            var inputFile =  JSON.parse(await fs.readFile("./scrape2020.json", "utf-8"))
        } catch {
            var inputFile = []
        }
        const { data } = await axios.get(url)
        const $ = cheerio.load(data)
        const songs = []
        var container = $("div#dataList > div > a.style-1")
        for (var i in container) {
            try {
            songs.push({
                "title": container[i].children[0].data,
                "artist": container[i].nextSibling.data.substr(5).replace(" [DE]", "")
            })
            } catch (e) {
                //console.log(e)
            }
        }
        await fs.writeFile("./scrape2020.json", JSON.stringify(inputFile.concat(songs)), "utf8")
        console.log(url, " Fetched", songs.length)

    } catch (e) {
        throw (e)
    }
}
function wait(time) {
    return new Promise((resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    }))
}
for (var i = 1; i <= 16; i++) {
    await getSongs("https://www.chartsurfer.de/archiv/single-charts-deutschland/2020-" + i)
    await wait (2000)
}

