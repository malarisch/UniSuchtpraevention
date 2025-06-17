import { client, client as spotifyApi } from "@suchtModules/spotifyApi";
import { Artist } from "spotify-api.js";
import fs from 'fs/promises'
import axios from "axios";



let search = await axios.get('https://api.spotify.com/v1/search', {
    params: {
        "q": process.argv[2],
        "type": "playlist",
        "market": "DE",
        "limit": 20
    },
    headers: {
        "Authorization": "Bearer " + client.token
    }
})
console.log(search.data.playlists.items.length, "Playlists found");
for (var i in search.data.playlists.items) {
    if (search.data.playlists.items[i] != null) {
        await saveTracks(search.data.playlists.items[i])
    }
}

async function saveTracks(playlistObj: any) {
    console.log(playlistObj)
    const playlistReq= await axios.get(playlistObj.tracks.href, {
    headers: {
        "Authorization": "Bearer " + client.token
        }
    })
    const playlist = playlistReq.data.items
console.log(process.argv[2], playlist)
let out = []
for (var i in playlist) {
    console.log("\n\n----")
    console.log(playlist[parseInt(i)].track?.name + ":")
    let writeOutTitle = playlist[parseInt(i)].track?.name ?? 'Error'
    if (writeOutTitle.includes(" (feat.")) {
        writeOutTitle = writeOutTitle.split(" (feat.")[0]
    }
    //@ts-ignore
    for (var j in playlist[parseInt(i)]?.track?.artists as Artist) {
        //@ts-ignore
        console.log(playlist[parseInt(i)].track.artists[j].name)
    }
    //@ts-ignore
    out.push({title: writeOutTitle, artist: playlist[parseInt(i)]?.track?.artists[0].name})
}
await fs.writeFile("./src/tools/" + (playlistObj?.name?.replace(" ", "-")??"error") + playlistObj?.id +".json", JSON.stringify(out))
}
 
