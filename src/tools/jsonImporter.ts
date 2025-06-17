import {database, Queues} from '@suchtModules/index'
import fs from 'fs/promises'

console.log("Loading", process.argv[2])

interface scrapeEntry {
    title: string,
    artist: string
}

let file: Array<scrapeEntry> = JSON.parse(await fs.readFile(process.argv[2], "utf-8"))

for (var i in file) {
    let artist = file[i].artist.replace(" [DE]", "").replace(/[\[][a-zA-Z]*[\]]/ig, "")
    if (artist.includes(" x ") && artist.length >= 30) {
        artist = artist.split(" x ")[0]
    } else if (artist.includes(" x ") && artist.length < 30) {
        artist = artist.replace (" x ", " ")
    }
    if (artist.includes(", ")) {
        artist = artist.replace(", ", " ")
    }
    if (artist.includes("& ") && artist.length >= 30) {
        artist = artist.split("& ")[0]
    }
    
    let job = await Queues.QueueList.songFetcherQueue.add(artist + " - " + file[i].title, {
        searchString: artist + " - " + file[i].title,
        chain: true,
        chainAiAnalysis: false
    })
    console.log("Added", job.id, "for", file[i].title + " " + file[i].artist.replace(" [DE]", ""),)
};