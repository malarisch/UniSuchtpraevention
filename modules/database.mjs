import {Sequelize, Model, DataTypes} from 'sequelize';

const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite'
});

const Artist = sequelize.define('artist', {
    name: DataTypes.TEXT,
    meta: DataTypes.JSON,
    geniusId: DataTypes.INTEGER
})
const Song = sequelize.define('song', {
    title: DataTypes.TEXT,
    year: DataTypes.DATEONLY,
    lang: DataTypes.STRING,
    lyrics: DataTypes.STRING,
    lyricsState: DataTypes.STRING,
    meta: DataTypes.JSON,
    geniusId: DataTypes.INTEGER
})

const Album = sequelize.define("album", {
    title: DataTypes.STRING,
    year: DataTypes.DATEONLY
})

Song.belongsTo(Album);
Song.hasMany(Artist)
Artist.hasMany(Song);
Artist.hasMany(Album);

Album.hasMany(Song)

export async function sync() {
    await sequelize.sync({
        alter: true
    })
}
export {
    sequelize, Artist, Song, Album
}
