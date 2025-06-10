import { addRatingToDb, rateLyrics } from '../../../UniSuchtpräv/UniSuchtpraevention/modules/aiConnector.mjs';
import * as database from '../modules/database.mjs'
import * as lyricsFetcher from '../modules/lyricsFetcher.mjs'

async function hasAnalysis(response, request, context) {

                    for (var i in context.records) {
                        let song = await database.Song.findByPk(context.records[i].params.id, {include: database.substanceRating});
                        //console.log(context.records[i].params)
                        context.records[i].params.hasAnalysis = (song.substanceRatings.length > 0 ? true : false)
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
                handler: async (request, response, context) => {
                    const { record } = context;
                    if (!record) {
                        throw new Error('Kein Datensatz gefunden');
                    }
                    console.log("Fetching from: ", record.params.geniusURL)
                    let fetchedLyrics = await lyricsFetcher.lyricsFromURL(record.params.geniusURL);
                    console.log("Lyrics: ", fetchedLyrics)
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
                handler: async (request, response, context) => {
                    const { record } = context;
                    if (!record) {
                        throw new Error('Kein Datensatz gefunden');
                    }
                    var aiAnalse = await rateLyrics(record.params.lyrics)
                    var addedSets = await addRatingToDb(aiAnalse, record.params.id)
                    return {
                        record: record.toJSON(),
                        notice: {
                            message: JSON.stringify(aiAnalse),
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