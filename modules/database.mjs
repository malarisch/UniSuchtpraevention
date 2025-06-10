import {Sequelize, Model, DataTypes} from 'sequelize';

const sequelize = new Sequelize("postgres://wolff@localhost:5432/wolff");

const Artist = sequelize.define('artist', {
    name: DataTypes.TEXT,
    meta: DataTypes.JSONB,
    geniusId: DataTypes.INTEGER,
    geniusURL: DataTypes.STRING
})
const Song = sequelize.define('song', {
    title: DataTypes.TEXT,
    releaseDate: DataTypes.DATE,
    lang: DataTypes.STRING(512),
    lyrics: DataTypes.TEXT,
    lyricsState: DataTypes.STRING,

    meta: DataTypes.JSONB,
    geniusId: DataTypes.INTEGER,
    geniusURL: DataTypes.STRING(512)
})

const Album = sequelize.define("album", {
    title: DataTypes.STRING,
    releaseDate: DataTypes.DATE,
    geniusURL: DataTypes.STRING(512),
    geniusId: DataTypes.INTEGER,
    meta: DataTypes.JSONB
})
const substanceRating = sequelize.define("substanceRating", {
    substance: DataTypes.STRING,
    wortwahl: DataTypes.FLOAT,
    hauefigkeit: DataTypes.FLOAT,
    perspektive: DataTypes.FLOAT,
    kontext: DataTypes.FLOAT,
    sysPromptVer: DataTypes.INTEGER
})


const Artist_Songs = sequelize.define("Artist_Songs", {
    isPrimaryArtist: DataTypes.BOOLEAN
})
const Artist_Albums = sequelize.define("Artist_Albums", {
    isPrimaryArtist: DataTypes.BOOLEAN
})
substanceRating.belongsTo(Song);
Song.hasMany(substanceRating)

Song.belongsToMany(Artist, {through: Artist_Songs})
Artist.belongsToMany(Song, {through: Artist_Songs})

Artist.belongsToMany(Album, {through: Artist_Albums})
Album.belongsToMany(Artist, {through: Artist_Albums})

Album.hasMany(Song)
Song.belongsTo(Album)

export async function sync() {
    await sequelize.sync({
        alter: true
    })
}
class ImprovedSequelizeError extends Error {
  constructor(originalError) {
    super();
    this.name = originalError.name;

    let { message } = originalError.parent;
    if (originalError.sql) {
      message += "\nSQL: " + originalError.sql;
    }

    if (originalError.parameters) {
      const stringifiedParameters = JSON.stringify(originalError.parameters);
      if (
        stringifiedParameters !== "undefined" &&
        stringifiedParameters !== "{}"
      ) {
        message += "\nParameters: " + stringifiedParameters;
      }
    }

    message += "\n" + originalError.stack;

    this.message = message;

    Error.captureStackTrace(this, fixSequelizeError);
  }
}

const isSequelizeError = (e) =>
  e instanceof Error && e.name.startsWith("Sequelize");

const fixSequelizeError = (e) => {
  if (isSequelizeError(e)) {
    throw new ImprovedSequelizeError(e);
  }

  throw e;
};


export {
    sequelize, Artist, Song, Album, Artist_Songs, fixSequelizeError, substanceRating
}
