import { database, logger as loggerConstructor, substanceTagger } from '@suchtModules/index'
import { Command } from 'commander';
import figlet from 'figlet';
import * as process from "node:process";
import * as cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import fs from "node:fs/promises";
import { fn, QueryTypes } from "sequelize";
import * as entities from 'entities'
import { QueueList } from '@suchtModules/queues';

import { Song, SubstanceCategories_Songs, Substances_Songs, Artist } from '@suchtModules/database'
import { client as spotifyClient } from '@suchtModules/spotifyApi'
import dotenv from "dotenv"; dotenv.config({ path: (!process.env.dotenv ? undefined : process.env.dotenv) });
import { Op } from "sequelize";
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
            const bar = new cliProgress.SingleBar({
                format: 'CLI Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Songs',
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
                    try { await substanceTagger.tagSong(song); }
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
        let result = await database.sequelize.query(sqlStatement, { type: QueryTypes.SELECT });
        console.debug(result);
        let seed = 0;
        let now = new Date();
        // @ts-ignore
        let outputString = "" + (parseInt(result.length) - 1) + " Lyrics | Song Order: " + seed + "  \r\nGenerated " + now.toDateString() + " " + now.toTimeString() + "  \r\n---\r\n";
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
        let result = await database.sequelize.query(sqlStatement, { type: QueryTypes.UPDATE });
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
        let result = await database.sequelize.query(sqlStatement, { type: QueryTypes.SELECT });
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

                out = xmlBase.replace("titlePlaceholder", title.substring(0, 255)).replace("descPlaceholder", entities.encodeNonAsciiHTML(desc).replaceAll("\r\n", "<br />"));
                out = out.replaceAll("substances", "substances" + i)
                    .replaceAll("WordingRating", "wording" + i)
                    .replaceAll("PerspectiveRating", "perspective" + i)
                    .replaceAll("ContextRating", "context" + i)
                    .replaceAll("GlamorizationRating", "glamorization" + i)
                    .replaceAll("HarmAckRating", "harmack" + i)
                    .replaceAll("anmerkung", "anmerkung" + i)
                await fs.writeFile(options.folder + "limesurveyGroup" + i + ".lsg", out, "utf8");
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
            const songs = await Song.findAll({ include: database.SubstanceRating });
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
program
    .command('analyzeGoldenSet')
    .description('Enqueue AI analysis jobs for all songs in the golden set.')
    .action(async () => {
        try {
            logger.info('Syncing Database...');
            await database.sync();
            logger.info('Database synced.');

            const songs = await Song.findAll({
                where: {
                    isGoldenSet: true,
                },
            });
            logger.info(`Fetched ${songs.length} golden set songs from the database.`);

            logger.info('Enqueuing AI analysis jobs for golden set songs...');
            for (const song of songs) {
                await QueueList.aiAnalysisQueue.add('aiAnalysis', {
                    internalId: song.id,
                });
                logger.info(`Job enqueued for Song ID: ${song.id}, Title: "${song.title}"`);
            }
            logger.info('Jobs for all golden set songs have been successfully enqueued.');


        }
        catch (error) {
            logger.error('An error occurred while enqueuing jobs for golden set songs:', error);
        } finally {
            process.exit(0);
        }
    });


program
    .command('addArtist')
    .description('Add an artist to the DB and enqueue songFetcher jobs for the artist\'s top tracks (Spotify).')
    .requiredOption('-q, --query <nameOrId>', 'Artist name (search) or Spotify artist ID')
    .option('--isList', "Indicates that the query contains a semicolon-separated list of artist names or IDs")
    .option('-n, --top <n>', 'How many top tracks to enqueue (default: 10)', '10')
    .option('--market <cc>', 'Spotify market country code (default: DE)', 'DE')
    .option('--chain', 'Chain lyrics fetch after song creation (worker: songFetcher -> lyricsFetcher)', false)
    .option('--chainAi', 'When chaining, also chain AI analysis after lyrics are fetched', false)
    .option('--dryRun', 'Do not enqueue any jobs, just simulate the process', false)
    .option('--sourceString <source>', 'Source string to associate with the artist', 'generic')
    .action(async (options) => {
        try {
            logger.info('Syncing Database...');
            await database.sync();
            logger.info('Database synced.');
            logger.info(`Processing addArtist with query: ${options.query}`);
            const topN = Math.max(1, Number.parseInt(String(options.top), 10) || 10);
            const market = String(options.market || 'DE').toUpperCase();
            const chain = Boolean(options.chain);
            const chainAiAnalysis = Boolean(options.chainAi);

            async function processQuery(query: string) {

                logger.info(`Processing artist query: ${query}`);
                // Resolve artist (ID or search)
                let spotifyArtist: any | null = null;
                if (/^[0-9A-Za-z]{22}$/.test(query)) {
                    // looks like a Spotify ID
                    spotifyArtist = await spotifyClient.artists.get(query);
                } else {
                    const results = await spotifyClient.artists.search(query, { limit: 1, market });
                    spotifyArtist = results?.[0] ?? null;
                }

                if (!spotifyArtist) {
                    throw new Error(`No Spotify artist found for query: ${query}`);
                }

                // Persist minimal artist record locally (we repurpose Artist.meta for Spotify data)
                const spotifyId: string | undefined = spotifyArtist.id;
                const spotifyUrl: string | undefined = spotifyArtist?.external_urls?.spotify;

                if (!spotifyId) {
                    throw new Error('Spotify artist object has no id');
                }

                /*const [artist, wasCreated] = await Artist.findOrCreate({
                    where: { geniusId: 0 },
                    defaults: {
                        name: spotifyArtist.name,
                        geniusId: 0,
                        geniusURL: spotifyUrl ?? '',
                        meta: {
                            source: 'spotify',
                            spotifyArtistId: spotifyId,
                            spotify: spotifyArtist,
                        }
                    } as any
                });
                if (!wasCreated) {
                    await artist.update({
                        name: spotifyArtist.name,
                        geniusURL: spotifyUrl ?? artist.geniusURL,
                        meta: {
                            ...(artist.meta as any ?? {}),
                            source: 'spotify',
                            spotifyArtistId: spotifyId,
                            spotify: spotifyArtist,
                        }
                    } as any);
                }
    */
                logger.info(`Using Spotify artist: ${spotifyArtist.name} (${spotifyId}).`);

                // Fetch top tracks
                const topTracks: any[] = await spotifyClient.artists.getTopTracks(spotifyId, market);

                if (!topTracks.length) {
                    logger.warn('Spotify returned no top tracks. Nothing to enqueue.');
                    process.exit(0);
                }

                const tracks = topTracks.slice(0, topN);
                logger.info(`Enqueuing ${tracks.length} songFetcher jobs (chain=${chain}, chainAi=${chainAiAnalysis})...`);

                for (const t of tracks) {
                    const title = t?.name;
                    const primaryArtist = t?.artists?.[0]?.name ?? spotifyArtist.name;
                    const searchString = `${primaryArtist} - ${title}`;

                    if (!options.dryRun) await QueueList.songFetcherQueue.add('songFetch', {
                        source: options.sourceString,
                        searchString,
                        chain,
                        chainAiAnalysis
                    });
                    logger.info(`  queued: ${searchString}`);
                }
            }

            if (options.isList) {
                logger.info('Processing as list of queries.');
                const queries = (options.query as string).split(';').map((q) => q.trim()).filter((q) => q.length > 0);
                let i = 0;
                for (const q of queries) {
                    await sleep(1000); // stagger by 1s to avoid rate limits
                    logger.info(`Processing query from list: ${q}`);
                    await processQuery(q);

                }
            } else {
                logger.info('Processing single query.');
                const query = String(options.query).trim();
                await processQuery(query);
            }

            logger.info('Done.');
        } catch (error) {
            logger.error('addArtist failed:', error);
        } finally {
            process.exit(0);
        }
    });


function calcOHS(wording: number, perspective: number, context: number, glamorization: number, harmAck: number, mentions?: number): number {
    // Example calculation (weights can be adjusted as needed)
    const ohs =(
        (wording * 0.2) +
        (perspective * 0.25) +
        (context * 0.20) +
        (glamorization * 0.15) +
        (harmAck * 0.4)) * (mentions ?  -((1 / (1 + Math.exp(5*(mentions - 1))))*3)+3 : 1);
    return parseFloat(ohs.toFixed(3)); // Round to 3 decimal places
}


program.command("updateOHS")
    .description("Update OHS values in the database based on latest ratings")
    .action(async () => {
        logger.info("Syncing Database...");
        await database.sync();
        logger.info("Synced Database.")
        const songs = await Song.findAll(
            {
                include: { model: database.SubstanceRating }
            }


        );
        const substanceCategories = await database.SubstanceCategory.findAll();
        
        logger.info(`Fetched ${songs.length} songs from the database.`);
        const progressBar = new cliProgress.SingleBar({
            format: 'Updating OHS Values |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Songs',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
        }, cliProgress.Presets.shades_classic);

        progressBar.start(songs.length, 0);

        for (const song of songs) {
            progressBar.increment();
            let totalOHS = 0;
            if (song.SubstanceRatings && song.SubstanceRatings.length > 0) {
                for (let individualRating of song.SubstanceRatings) {
                    // Assuming one rating per song for simplicity
                    let substanceCategoryId = 0;
                    let substanceCatName = "";
                    for (let sc of substanceCategories) {
                        if (sc.name.toLocaleLowerCase().indexOf(individualRating.substanceCategory.toLowerCase()) >= 0
                            || individualRating.substanceCategory.toLowerCase().indexOf(sc.name.toLocaleLowerCase()) >= 0) {
                            substanceCategoryId = sc.id;
                            substanceCatName = sc.name;
                            break;
                        }
                    }
                    const substanceCountSong = await database.SubstanceCategories_Songs.findOne({ where: { [Op.and]: [{ songId: song.id }, { SubstanceCategoryId: substanceCategoryId }] } });

                    const ohs = calcOHS(
                        individualRating.wording,
                        individualRating.perspective,
                        individualRating.context,
                        individualRating.glamorization,
                        individualRating.harmAcknowledgement,
                        (substanceCountSong ? substanceCountSong.locations.length : 1)
                        
                    );
                    individualRating.OHS = ohs;
                    await individualRating.save();
                    totalOHS += ohs;
                    logger.info(`Calculated OHS for Song ID ${song.id} (${song.title}): ${ohs} based on Substance Category ID ${substanceCategoryId} (${substanceCatName})`);
                }

            const avgOHS = totalOHS / (song.SubstanceRatings?.length || 0);
            song.OHS = parseFloat(avgOHS.toFixed(3));
            logger.info(`Updating Song ID ${song.id} (${song.title}) with average OHS: ${song.OHS}`);
            await song.save();
            }


        }



        progressBar.stop();
        const artists = await Artist.findAll({include: { model: database.Song }});
        logger.info(`Fetched ${artists.length} artists from the database.`);
        const artistProgressBar = new cliProgress.SingleBar({
            format: 'Updating Artist OHS Values |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Artists',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
        }, cliProgress.Presets.shades_classic);

        artistProgressBar.start(artists.length, 0);

        for (const artist of artists) {
            artistProgressBar.increment();
            ;
            let totalArtistOHS = 0;
            let countedSongs = 0;
            //@ts-ignore
            for (const song of artist.songs) {
                if (song.OHS) {
                    totalArtistOHS += song.OHS;
                    countedSongs++;
                }
            }
            if (countedSongs > 0) {
                const avgArtistOHS = totalArtistOHS / countedSongs;
                artist.OHS = parseFloat(avgArtistOHS.toFixed(3));
                logger.info(`Updating Artist ID ${artist.id} (${artist.name}) with average OHS: ${artist.OHS}`);
                await artist.save();
            }
        }
        artistProgressBar.stop();
    });


program.parse();
program.showHelpAfterError();


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}