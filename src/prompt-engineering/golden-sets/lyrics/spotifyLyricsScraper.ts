import { client as spotifyApi } from "@suchtModules/spotifyApi";
import { Artist } from "spotify-api.js";
import fs from 'fs/promises'

const playlistObj = await spotifyApi.playlists.get(process.argv[2])
const playlist = await spotifyApi.playlists.getTracks(process.argv[2])
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
await fs.writeFile("./src/tools/" + (playlistObj?.name?.replace(" ", "-")??"error") + ".json", JSON.stringify(out))