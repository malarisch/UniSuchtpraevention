import {logger as loggerConstructor} from './index'
import {Song, Substance, SubstanceCategory, Substances_Songs, SubstanceCategories_Songs} from "@suchtModules/database";

const logger =
    await loggerConstructor.logger();
import fs from 'fs/promises'

import 'dotenv/config'


interface FileSubstance {
    name: string
    terms: string[]
}

interface FileSubstanceCategory {
    name: string,
    verbs: string[],
    Substances: FileSubstance[]
}


interface substanceIndexFileSchema {
    version: number,
    substances: FileSubstanceCategory[]
}


let indexVersion: number;

export async function importIndexToDatabase(file: string) {
    const substanceIndex: substanceIndexFileSchema = JSON.parse(await fs.readFile(file, "utf-8"))
    const substanceFile = substanceIndex.substances
    logger.info(`Substance Index Schema: Loaded ${substanceIndex.substances.length} Main Categories from Index File Version ${substanceIndex.version}`)
    indexVersion = substanceIndex.version
    let categories = 0;
    let substances = 0;
    let verbs = 0;
    let terms = 0;
    for (let i in substanceFile) {
        //console.log(substanceFile[i])
        let [cat, createdCat] = await SubstanceCategory.findOrCreate({

            where: {name: substanceFile[i].name},
            defaults: {
                name: substanceFile[i].name,
                verbs: substanceFile[i].verbs
            }
        })
        logger.info((createdCat ? "Created" : "Found") + " SubstanceCategory " + cat.name)
        if (cat.verbs.length !== substanceFile[i].verbs.length) {
            logger.info(`SubstanceCategory ${cat.name} has other verbs, updating...`)
            await cat.update({
                verbs: substanceFile[i].verbs
            })
        }
        verbs += cat.verbs.length;
        categories++;
        for (let j in substanceFile[i].Substances) {

            let [substance, subCreated] = await Substance.findOrCreate({
                where: {name: substanceFile[i].Substances[j].name},
                defaults: {
                    name: substanceFile[i].Substances[j].name,
                    terms: substanceFile[i].Substances[j].terms,
                    //@ts-ignore
                    SubstanceCategoryId: cat.id
                }, include: SubstanceCategory
            })
            logger.info((subCreated ? "Created" : "Found") + " Substance " + substance.name + "in Category " + cat.name)
            if (substance.terms !== substanceFile[i].Substances[j].terms) {
                logger.info(`Substance ${substance.name} has other terms. Updating...`)
                await substance.update({terms: substanceFile[i].Substances[j].terms})
            }
            if (!substance) throw new Error("Substance Error", substance)
            if (!subCreated && substance.SubstanceCategory?.name !== cat.name) {
                logger.info(`Substance changed category ${substance.SubstanceCategory?.name} to ${cat.name}. Updating...`)

                await substance.setSubstanceCategory(cat)

            }
            terms += substanceFile[i].Substances[j].terms.length;
            substances++;
        }
    }
    logger.info(`Database contains ${categories} Categories`);
    logger.info(`Database contains ${substances} Substances`);
    logger.info(`Database contains ${terms} Terms`);
    logger.info(`Database contains ${verbs} Verbs`);
}

interface regExSubstance {
    regex: RegExp;
    value: string
    top: Substance | SubstanceCategory
}

export type SubstanceCategoriesRegex = regExSubstance[];
export var regexSubstances: SubstanceCategoriesRegex = []

export async function buildRegExes() {
    const substances = await Substance.findAll({}) // find all substances
    for (let i in substances) {
        for (let j in substances[i].terms) {
            regexSubstances.push({
                regex: new RegExp(substances[i].terms[j], "gi"),
                value: substances[i].terms[j],
                top: substances[i]
            })
        }

    }
    const substanceCats = await SubstanceCategory.findAll({});
    for (let i in substanceCats) {
        for (let j in substanceCats[i].verbs) {
            regexSubstances.push({
                regex: new RegExp(substanceCats[i].verbs[j], "gi"),
                value: substanceCats[i].verbs[j],
                top: substanceCats[i]
            })
        }

    }
    logger.info(`Built ${regexSubstances.length} RegExes`)
}

export async function tagSong(song: Song | number) {
    if (!(song instanceof Song)) {
        let query = await Song.findOne({where: {id: song}})
        if (!query) throw new Error(`Song with id ${song} not found`)
        song = query;
    }
    if (!song?.lyrics) throw new Error("Song has no lyrics");
    if (regexSubstances.length < 1) {
        await buildRegExes()
    }

    for (let i in regexSubstances) {
        let result = song.lyrics.matchAll(regexSubstances[i].regex)
        if (result != null) {

            let locs: number[] = []
            for (let k of result) {

                locs.push(k.index);
            }
            if (locs.length > 0) {
                logger.info(`Found ${regexSubstances[i].top.name} with ${regexSubstances[i].value} at ${JSON.stringify(locs)} in ${song.title}`)
                if (regexSubstances[i].top instanceof Substance) {
                    await Substances_Songs.findOrCreate({where: {
                        //@ts-ignore
                            songId: song.id,
                            SubstanceId: regexSubstances[i].top.id,
                            value: regexSubstances[i].value,
                        }, defaults: {
                        // @ts-ignore
                            songId: song.id,
                            SubstanceId: regexSubstances[i].top.id,
                            value: regexSubstances[i].value,
                            indexVersion: indexVersion,
                            locations: locs
                        }})
                    await song.addSubstance(regexSubstances[i].top, {
                        through: {
                            locations: locs,
                            indexVersion: indexVersion,
                            value: regexSubstances[i].value
                        }
                    })
                } else if (regexSubstances[i].top instanceof SubstanceCategory) {
                    await SubstanceCategories_Songs.findOrCreate({where: {
                            //@ts-ignore
                            songId: song.id,
                            SubstanceCategoryId: regexSubstances[i].top.id,
                            value: regexSubstances[i].value,
                        }, defaults: {
                            // @ts-ignore
                            songId: song.id,
                            SubstanceCategoryId: regexSubstances[i].top.id,
                            value: regexSubstances[i].value,
                            indexVersion: indexVersion,
                            locations: locs
                        }})
                }
            }

        }
    }
}

export async function updateSongSubstanceMentionCount(all: boolean = true, id: number | null = null) {


}