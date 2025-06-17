import { addRatingToDb, rateLyrics } from '../modules/aiConnector';
import * as database from '../modules/database'
import * as lyricsFetcher from '../modules/lyricsFetcher'
import { logger as loggerConstructor} from '../modules/logger'
const logger = await loggerConstructor()




async function hasAnalysis(response: any, request: any, context: any) {

                    for (var i in context.records) {
                        let song = await database.Song.findByPk(context.records[i].params.id, {include: database.SubstanceRating});
                        
                        context.records[i].params.hasAnalysis = ((song?.SubstanceRatings as database.SubstanceRating[]).length > 0 ? true : false)
                        context.records[i].params.hasLyrics = (context.records[i].params.lyrics == null ? false : true)
                    }
                    
                    return response
                }

export const SongsResource = {
    resource: database.Song,
    options: {
        actions: {
            fetchLyrics: {
                actionType: 'record',
                component: false,
                handler: async (reques: any, response: any, context: any) => {
                    const { record } = context;
                    if (!record) {
                        throw new Error('Kein Datensatz gefunden');
                    }
                    logger.info("Fetching from: ", record.params.geniusURL)
                    let fetchedLyrics = await lyricsFetcher.lyricsFromURL(record.params.geniusURL);
                    logger.info("Lyrics: ", fetchedLyrics)
                    try {
                        await record.update({ lyrics: fetchedLyrics })
                    } catch (e) {
                        database.fixSequelizeError(e);
                    }
                    
                    return {
                        record: record.toJSON(),
                        notice: {
                            message: "Fetched Lyrics (" + fetchedLyrics.length + " Characters)",
                            type: 'success'
                        }

                    }
                },
            },
            aiAnalysis: {
                actionType: "record",
                component: false,
                handler: async (request: any, response: any, context: any) => {
                    const { record } = context;
                    if (!record) {
                        throw new Error('Kein Datensatz gefunden');
                    }
                    var aiAnalse = await rateLyrics(record.params.lyrics)
                    var addedSets = await addRatingToDb(aiAnalse, record.params.id)
                    return {
                        record: record.toJSON(),
                        notice: {
                            message: JSON.stringify({analysis: aiAnalse, addedDatasets: addedSets}),
                            type: 'success'
                        }

                    }
                }
            }
            ,
            show: {
                after: hasAnalysis
            },
            list: {
                after: hasAnalysis
            }
        },
        properties: {
            hasAnalysis: {
                type: 'boolean',
                label: 'Analyse Vorhanden',
                isVisible: { list: true, show: true },

            },
            hasLyrics: {
                type: 'boolean',
                label: 'Lyrics Vorhanden',
                isVisible: {list: true, show: false}
            }
        }
    }
    
}