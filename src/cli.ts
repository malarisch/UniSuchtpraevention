import {database, logger as loggerConstructor, substanceTagger} from '@suchtModules/index'
import {Command} from 'commander';
import figlet from 'figlet';
import * as process from "node:process";
import * as cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import fs from "node:fs/promises";
import {fn, QueryTypes} from "sequelize";
import * as entities from 'entities'
import { QueueList } from '@suchtModules/queues';

import {Song, SubstanceCategories_Songs, Substances_Songs} from '@suchtModules/database'
import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
const logger = await loggerConstructor.logger()

const program = new Command();

console.log(figlet.textSync("PanschCLInes"))
program.version('dev')
    .description("CLI for Gepanschte Lines")

program.command('tagger')
    .description("Interface for the Substance Index")
    .option("-u, --update", "Update Database from File")
    .option("-f, --filename <filename>", "Used Filename")
    .option("-s, --tag-song <id>", "Tag song with <id>")
    .option(" --toId <id>", "from id to id")
    .option("-a, --all", "Use all songs")
    .option("--prune", "Remove all associations first.")
    .action(async (options) => {
        console.log("Syncing Database...");
        await database.sync();
        console.log("Synced Database.")
        if (options.prune) {
            logger.warn("Removing all Substance/Song Tags")
            await Substances_Songs.truncate();
            logger.warn("Removed all Instances of Substances_Songs")
            await SubstanceCategories_Songs.truncate();
            logger.warn("Removed all Instances of SubstanceCategories_Songs")
            await database.sequelize.query("ALTER SEQUENCE \"SubstanceCat_Songs_id_seq\" RESTART; ALTER SEQUENCE \"Substances_Songs_id_seq\" RESTART;")

        }
        if (options.update && options.filename) {
            console.log("Importing " + options.filename);
            await substanceTagger.importIndexToDatabase(options.filename);
        } else if (options["tagSong"] && !options.toId) {

            logger.info("Tagging Song with id " + options["tagSong"]);
            await substanceTagger.tagSong(options["tagSong"]);
        } else if (options.tagSong && options.toId) {
            logger.info("Tagging Song with id " + options["tagSong"] + " to " + options.toId);
                const bar = new cliProgress.SingleBar({format: 'CLI Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Songs',
                    barCompleteChar: '\u2588',
                    barIncompleteChar: '\u2591',
                    hideCursor: true
                }, cliProgress.Presets.shades_classic);
                let songs: Song[];
                let noLyrics = 0;
                if (options.all) {
                    songs = await Song.findAll();
                    bar.start(songs.length, 0)
                    for (let i in songs) {
                        let song = songs[i];
                        try {await substanceTagger.tagSong(song);}
                        catch (e) {
                            noLyrics++;
                        }
                        bar.increment(1)
                    }
                    if (noLyrics > 0) logger.warn(noLyrics + " Songs without lyrics");

                } else {
                    bar.start(options.toId - options.tagSong, 0)
                    for (let i = options.tagSong; i <= options.toId; i++) {
                        logger.info("Tagging Song with id " + i);
                        try {
                            await substanceTagger.tagSong(i)
                        } catch (e) {
                            logger.error(e)
                        }

                        bar.update(i);
                    }
                }
                bar.stop();


        }
        process.exit(0);
    })
program.command("distillGoldenSet")
    .description("Stratifizierte Stichprobe von Songtexten anhand der Substance Counts aus der Datenbank nach Markdown exportieren")
    .option("--outfile <filename>", "Output file name")
    .action(async (options) => {
        logger.info("Syncing Database...");
        await database.sync();
        logger.info("Synced Database.")
        let sqlStatement = await fs.readFile("src/prompt-engineering/golden-sets/distillGoldenSet.sql", "utf8");
        logger.info("Read sql Statement. Length: " + sqlStatement.length);
        let result = await database.sequelize.query(sqlStatement, {type: QueryTypes.SELECT});
        console.debug(result);
        let seed = 0;
        let now = new Date();
        // @ts-ignore
        let outputString = "" + (parseInt(result.length)-1) + " Lyrics | Song Order: " + seed + "  \r\nGenerated " + now.toDateString() + " " + now.toTimeString() +"  \r\n---\r\n";
        for (let i in result) {
            // @ts-ignore
            if (i != 0) {
                let r: any = result[i];
                outputString += `## [${r.id}] [${r.artist} - ${r.title}](${r.geniusURL}) (${new Date(r.releaseDate).getFullYear()}) \r\n`;
                outputString += `### Pre-Tagging Result: ${r.intensity_bin} (${r.mentions} Mentions) \r\n`;
                outputString += r.lyrics.replaceAll("\r\n", "  \r\n") + "\r\n";
                outputString += `\r\n---\r\n`
            }
        }
        await fs.writeFile(options.outfile, outputString, "utf8");
        process.exit(0);
    })

program.command("updateSubstanceMentions")
    .description("Update mentions and intensity_bin after updating the substance index")
    .action(async (options) => {
        logger.info("Syncing Database...");
        await database.sync();
        logger.info("Synced Database.")
        let sqlStatement = await fs.readFile("src/prompt-engineering/golden-sets/updateSongIntensities.sql", "utf8");
        logger.info("Read sql Statement. Length: " + sqlStatement.length);
        let result = await database.sequelize.query(sqlStatement, {type: QueryTypes.UPDATE});
        logger.debug(result);
    })


program.command("distillGoldenSetForLimeSurvey")
    .description("Stratifizierte Stichprobe von Songtexten anhand der Substance Counts aus der Datenbank nach Markdown exportieren")
    .option("--folder <filename>", "Output folder name")
    .action(async (options) => {
        logger.info("Syncing Database...");
        await database.sync();
        logger.info("Synced Database.")
        await fs.mkdir(options.folder, { recursive: true })
        let sqlStatement = await fs.readFile("src/prompt-engineering/golden-sets/distillGoldenSet.sql", "utf8");
        let xmlBase = await fs.readFile("../groupWithDifferentSubstances.lsg", "utf8")
        logger.info("Read sql Statement. Length: " + sqlStatement.length);
        // @ts-ignore
        let result = await database.sequelize.query(sqlStatement, {type: QueryTypes.SELECT});
        let out = ""
        for (var i in result) {
            // @ts-ignore
            if (i != 0) {
                //@ts-ignore
                let r = result[i];
                let desc = ""
                // @ts-ignore
                let title = `${r.artist} - ${r.title}`;
                //@ts-ignore
                desc += `Pre-Tagging Result: ${r.intensity_bin} (${r.mentions} Mentions)\r\n`;
                //@ts-ignore
                desc += r.lyrics

                out = xmlBase.replace("titlePlaceholder", title.substring(0,255)).replace("descPlaceholder", entities.encodeNonAsciiHTML(desc).replaceAll("\r\n", "<br />"));
                out = out.replaceAll("substances", "substances" + i)
                    .replaceAll("WordingRating", "wording"+i)
                    .replaceAll("PerspectiveRating", "perspective"+i)
                    .replaceAll("ContextRating", "context"+i)
                    .replaceAll("GlamorizationRating", "glamorization"+i)
                    .replaceAll("HarmAckRating", "harmack"+i)
                    .replaceAll("anmerkung", "anmerkung"+i)
                await fs.writeFile( options.folder + "limesurveyGroup"+i+".lsg", out, "utf8");
                process.exit(0)

            }
        }


    })
program
    .command('checkAiAnalyses')
    .description('Check which songs already have AI annotations and enqueue jobs for missing ones.')
    .action(async () => {
        try {
            logger.info('Syncing Database...');
            await database.sync();
            logger.info('Database synced.');

            logger.info('Fetching all songs...');
            const songs = await Song.findAll({include: database.SubstanceRating});
            logger.info(`Fetched ${songs.length} songs from the database.`);

            const unannotatedSongs = [];
            const progressBar = new cliProgress.SingleBar({
                format: 'Processing Songs |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Songs',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true,
            }, cliProgress.Presets.shades_classic);

            progressBar.start(songs.length, 0);

            for (const song of songs) {
                progressBar.increment();
                if (!song.SubstanceRatings || song.SubstanceRatings.length === 0) {
                    unannotatedSongs.push(song);
                }
            }

            progressBar.stop();

            logger.info(`${unannotatedSongs.length} songs without AI annotations found.`);
            if (unannotatedSongs.length > 0) {
                logger.info('Enqueuing jobs for AI analysis...');
                for (const song of unannotatedSongs) {
                    await QueueList.aiAnalysisQueue.add('aiAnalysis', {
                        internalId: song.id,
                    });
                    logger.info(`Job enqueued for Song ID: ${song.id}, Title: "${song.title}"`);
                }
                logger.info('Jobs for all unannotated songs have been successfully enqueued.');
            } else {
                logger.info('All songs already have AI annotations.');
            }
        } catch (error) {
            logger.error('An error occurred while processing songs:', error);
        } finally {
            process.exit(0);
        }
    });



program.parse();
program.showHelpAfterError();
