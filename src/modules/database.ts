import {
  Association, DataTypes, HasManyAddAssociationMixin, HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin,
  HasManySetAssociationsMixin, HasManyAddAssociationsMixin, HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, Model, ModelDefined, Optional,
  Sequelize, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute, ForeignKey,
} from 'sequelize';
import 'dotenv/config'
import {logger as loggerConstructor} from './logger'
const logger = loggerConstructor()

const sequelize = new Sequelize(process.env.PG_DB as string, process.env.PG_USER as string, process.env.PG_PASSWORD as string, {
  host: process.env.PG_HOST,
  dialect: 'postgres',
  logging: false
});


class Artist extends Model<InferAttributes<Artist>, InferCreationAttributes<Artist>> {
  declare id: number;
  declare name: string;
  declare meta: object | null;
  declare geniusId: number;
  declare geniusURL: string;

  declare hasSong: HasManyHasAssociationMixin<Song, number>
  declare hasAlbum: HasManyHasAssociationMixin<Album, number>

  declare addSong: HasManyAddAssociationMixin<Song, number>
  declare addAlbum: HasManyAddAssociationMixin<Album, number>

}
Artist.init({
  id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  name: DataTypes.TEXT,
  meta: DataTypes.JSONB,
  geniusId: DataTypes.INTEGER,
  geniusURL: DataTypes.STRING
}, { sequelize, modelName: 'artist' });


class Song extends Model<InferAttributes<Song>, InferCreationAttributes<Song>> {
    declare id: CreationOptional<number>;

  declare title: string;
  declare releaseDate: Date;
  declare lang: string | null;
  declare lyrics: string | null;
  declare lyricsState: string;
  declare meta: object | null;
  declare geniusId: number;
  declare geniusURL: string;
  declare SubstanceRatings?: NonAttribute<SubstanceRating[]>
  declare SubstanceMentions?: number | null
}
Song.init({
  id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  title: DataTypes.TEXT,
  releaseDate: DataTypes.DATE,
  lang: DataTypes.STRING(512),
  lyrics: DataTypes.TEXT,
  lyricsState: DataTypes.STRING,
  meta: DataTypes.JSONB,
  geniusId: DataTypes.INTEGER,
  geniusURL: DataTypes.STRING(512),
  SubstanceMentions: {
    type: DataTypes.INET
  }
}, { sequelize, modelName: 'song' });

class Album extends Model<InferAttributes<Album>, InferCreationAttributes<Album>> {
    declare id: CreationOptional<number>;

  declare title: string;
  declare releaseDate: Date;
  declare geniusURL: string;
  declare geniusId: number;
  declare meta: object | null;

  declare hasSong: HasManyHasAssociationMixin<Song, number>
  declare addSong: HasManyAddAssociationMixin<Song, number>
}
Album.init({
  id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  title: DataTypes.STRING,
  releaseDate: DataTypes.DATE,
  geniusURL: DataTypes.STRING(512),
  geniusId: DataTypes.INTEGER,
  meta: DataTypes.JSONB
}, { sequelize, modelName: 'album' });

class SubstanceRating extends Model<InferAttributes<SubstanceRating>, InferCreationAttributes<SubstanceRating>> {
  declare id: CreationOptional<number>;

  declare substance: string;
  declare wortwahl: number;
  declare hauefigkeit: number;
  declare perspektive: number;
  declare kontext: number;
  declare sysPromptVer: number;
}
SubstanceRating.init({
  id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  substance: DataTypes.STRING,
  wortwahl: DataTypes.FLOAT,
  hauefigkeit: DataTypes.FLOAT,
  perspektive: DataTypes.FLOAT,
  kontext: DataTypes.FLOAT,
  sysPromptVer: DataTypes.INTEGER
}, { sequelize, modelName: 'SubstanceRating' });

class Artist_Songs extends Model<InferAttributes<Artist_Songs>, InferCreationAttributes<Artist_Songs>> {
  declare isPrimaryArtist: boolean;
}
Artist_Songs.init({
  isPrimaryArtist: DataTypes.BOOLEAN
}, { sequelize, modelName: 'Artist_Songs' });

class Artist_Albums extends Model<InferAttributes<Artist_Albums>, InferCreationAttributes<Artist_Albums>> {
  declare isPrimaryArtist: boolean;
}
Artist_Albums.init({
  isPrimaryArtist: DataTypes.BOOLEAN
}, { sequelize, modelName: 'Artist_Albums' });

SubstanceRating.belongsTo(Song);
Song.hasMany(SubstanceRating);

Song.belongsToMany(Artist, { through: Artist_Songs });
Artist.belongsToMany(Song, { through: Artist_Songs });

Artist.belongsToMany(Album, { through: Artist_Albums });
Album.belongsToMany(Artist, { through: Artist_Albums });

Album.hasMany(Song);
Song.belongsTo(Album);

export async function sync(): Promise<void> {
  await sequelize.sync({
    alter: false,
    logging: false
  });
}

class ImprovedSequelizeError extends Error {
  constructor(originalError: any) {
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

const isSequelizeError = (e: unknown): e is Error =>
  e instanceof Error && e.name.startsWith("Sequelize");

const fixSequelizeError = (e: unknown): never => {
  if (isSequelizeError(e)) {
    throw new ImprovedSequelizeError(e);
  }

  throw e;
};


export {
  sequelize,
  Artist,
  Song,
  Album,
  Artist_Songs,
  fixSequelizeError,
  SubstanceRating
}
