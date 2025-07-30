import {database, logger as loggerConstructor, substanceTagger} from '@suchtModules/index'
import {Command} from 'commander';
import figlet from 'figlet';
import * as process from "node:process";
import * as cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import fs from "node:fs/promises";
import {QueryTypes} from "sequelize";

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
    .action(async (options) => {
        console.log("Syncing Database...");
        await database.sync();
        console.log("Synced Database.")
        console.debug(options)
        if (options.update && options.filename) {
            console.log("Importing " + options.filename);
            await substanceTagger.importIndexToDatabase(options.filename);
        } else if (options["tagSong"] && !options.toId) {

            logger.info("Tagging Song with id " + options["tagSong"]);
            await substanceTagger.tagSong(options["tagSong"]);
        } else if (options.tagSong && options.toId) {
            logger.info("Tagging Song with id " + options["tagSong"] + " to " + options.toId);
                const bar = new cliProgress.SingleBar({format: 'CLI Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Chunks || Speed: {speed}',
                    barCompleteChar: '\u2588',
                    barIncompleteChar: '\u2591',
                    hideCursor: true
                }, cliProgress.Presets.shades_classic);
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
                bar.stop();


        }
        process.exit(0);
    })
program.command("distillGoldenSet")
    .option("--outfile <filename>", "Output file name")
    .action(async (options) => {
        logger.info("Syncing Database...");
        await database.sync();
        logger.info("Synced Database.")
        let sqlStatement = await fs.readFile("src/prompt-engineering/golden-sets/lyrics/distillGoldenSet.sql", "utf8");
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

program.parse();
program.showHelpAfterError();
