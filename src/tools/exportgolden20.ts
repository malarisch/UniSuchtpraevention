import { database } from "@suchtModules/index";
import { Op, Transaction } from 'sequelize';
import { sequelize, Song, Artist } from '@suchtModules/database';

type Intensity = 'none' | 'low' | 'medium' | 'high';
const BINS: Intensity[] = ['none', 'low', 'medium', 'high'];
const LIMIT_PER_BIN = 5;

const selections: Song[] = [];

  for (const bin of BINS) {
    const rows = await Song.findAll({
      where: { intensity_bin: bin, [Op.or]: [{lang: "de"}] },
      include: [Artist],
      order: sequelize.random(),              // ORDER BY random()
      limit: LIMIT_PER_BIN,
    });
    
    selections.push(...rows);
  }
var counter = 1
  selections.forEach((song: Song) => {
    console.log("# Song:", counter, song.title)
    console.log("## Artists:", (song.artists)?.map(a => a.name).join(', '), "\n\n")
    console.log("Intensity:", song.intensity_bin, "Substance Count:", song.mentions)
    console.log(song.lyrics, "\n\n\n")

    counter++;
  })