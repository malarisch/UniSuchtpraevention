import {
  Association,
  DataTypes,
  HasManyAddAssociationMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManySetAssociationsMixin,
  HasManyAddAssociationsMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  Model,
  ModelDefined,
  Optional,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  ForeignKey,
  BelongsToManyHasAssociationMixinOptions,
  BelongsToManyHasAssociationMixin,
  BelongsToManyAddAssociationMixin,
  HasOne,
  BelongsToSetAssociationMixin, BelongsToGetAssociationMixin, BelongsToCreateAssociationMixin,
} from 'sequelize';
import 'dotenv/config'
import {logger as loggerConstructor} from './logger'
import {Infer} from "zod/v4";
const logger = await loggerConstructor()

const sequelize = new Sequelize(process.env.PG_DB as string, process.env.PG_USER as string, process.env.PG_PASSWORD as string, {
  host: process.env.PG_HOST,
  dialect: 'postgres',
  logging: true
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
  declare SubstanceRatings?: NonAttribute<SubstanceRating[]>;
  declare mentions: number | null;
  declare intensity_bin: string | null;
  artists?: NonAttribute<Artist[]>;
  Substances?: NonAttribute<Substance[]>;
  declare hasSubstance: BelongsToManyHasAssociationMixin<Substance, number>
  declare addSubstance: BelongsToManyAddAssociationMixin<Substance, number>
  declare addSubstanceCategory: BelongsToManyAddAssociationMixin<SubstanceCategory, number>


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
  mentions: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  intensity_bin: DataTypes.STRING
  

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

class Substance extends Model<InferAttributes<Substance>, InferCreationAttributes<Substance>> {
  declare id: CreationOptional<number>;
  declare name: string
  declare terms: string[]
  declare hasSong: HasManyHasAssociationMixin<Song, number>
  declare addSong: HasManyAddAssociationMixin<Song, number>
  Songs?: NonAttribute<Song[]>;
  declare SubstanceCategory: NonAttribute<SubstanceCategory>
  declare getSubstanceCategory: BelongsToGetAssociationMixin<SubstanceCategory>;
  declare setSubstanceCategory: BelongsToSetAssociationMixin<SubstanceCategory, number>;
  declare createSubstanceCategory: BelongsToCreateAssociationMixin<SubstanceCategory>;
}

class SubstanceCategory extends Model<InferAttributes<SubstanceCategory>, InferCreationAttributes<SubstanceCategory>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare verbs: string[];
  Substances?: NonAttribute<Substance[]> | undefined;
  declare addSubstance: HasManyAddAssociationMixin<Substance, number>;
  declare hasSubstance: HasManyHasAssociationMixin<Substance, number>;
}

class Substances_Songs extends Model<InferAttributes<Substances_Songs>, InferCreationAttributes<Substances_Songs>> {
  declare id: CreationOptional<number>;
  declare SubstanceId: number
  declare songId: number
  declare locations: number[]
  declare indexVersion: number
  declare value: string
}
Substances_Songs.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  locations: DataTypes.ARRAY(DataTypes.INTEGER),
  indexVersion: DataTypes.INTEGER,
  value: DataTypes.STRING,
  SubstanceId: {
    type: DataTypes.INTEGER,
    unique: false
  },
  songId: {
    type: DataTypes.INTEGER,
    unique: false
  },
}, {sequelize, modelName: 'Substances_Song', indexes: [
    {
      unique: true,
      fields: ['id', 'value']
    }
  ]});

class SubstanceCategories_Songs extends Model<InferAttributes<SubstanceCategories_Songs>, InferCreationAttributes<SubstanceCategories_Songs>> {
  declare id: CreationOptional<number>;
  declare songId: number
  declare SubstanceCategoryId: number
  declare locations: number[]
  declare indexVersion: number
  declare value: string
}
SubstanceCategories_Songs.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },

      locations: DataTypes.ARRAY(DataTypes.INTEGER),
      indexVersion: DataTypes.INTEGER,
      value: DataTypes.STRING,
      SubstanceCategoryId: {
        type: DataTypes.INTEGER,
        unique: false
      },
      songId: {
        type: DataTypes.INTEGER,
        unique: false
      }
    },
    {
      sequelize, modelName: 'SubstanceCat_Songs', indexes: [
        {
          unique: true,
          fields: ['id', 'value']
        }
        ]
    });


Substance.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  name: DataTypes.TEXT,
  terms: DataTypes.ARRAY(DataTypes.STRING(256))},
      {sequelize, modelName: 'Substance'}
)
SubstanceCategory.init( {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  name: DataTypes.TEXT,
  verbs: DataTypes.ARRAY(DataTypes.STRING(256))
}, {sequelize, modelName: 'SubstanceCategories'})


// Substance gehört zu genau einer Kategorie → foreign key in Substance-Tabelle.
Substance.belongsTo(SubstanceCategory, {
  foreignKey: { allowNull: false },
  onDelete: 'RESTRICT'
});
// Optional: reverse side, falls Category → Substances benötigt wird
SubstanceCategory.hasMany(Substance);

class SubstanceRating extends Model<InferAttributes<SubstanceRating>, InferCreationAttributes<SubstanceRating>> {
  declare id: CreationOptional<number>;

  declare substance: string;
  declare wording: number;
  declare perspective: number;
  declare context: number;
  declare glamorization: number;
  declare harmAcknowledgement: number;
  declare sysPromptVer: number;
}
SubstanceRating.init({
  id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
  substance: DataTypes.STRING,
  wording: DataTypes.FLOAT,
  perspective: DataTypes.FLOAT,
  context: DataTypes.FLOAT,
  glamorization: DataTypes.FLOAT,
  harmAcknowledgement: DataTypes.FLOAT,
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

Song.belongsToMany(Substance, { through: {model: Substances_Songs, unique: false, paranoid: false}})

Substance.belongsToMany(Song,
    { through: {model: Substances_Songs, unique: false}})

Song.belongsToMany(SubstanceCategory, { through: {model: SubstanceCategories_Songs, unique: false}}, )
SubstanceCategory.belongsToMany(Song, { through: {model: SubstanceCategories_Songs, unique: false}})


export async function sync(alter: boolean = true, logging: boolean = false): Promise<void> {
  await sequelize.sync({
    alter: alter
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
  SubstanceRating,
    Substance,
    SubstanceCategory,
    Substances_Songs,
    SubstanceCategories_Songs
}
