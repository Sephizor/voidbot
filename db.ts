import { Sequelize } from "sequelize";
import path from "path";

const dbpath = path.resolve(`${__dirname}/../db/voidbot.sqlite`);

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbpath,
});

console.log(`DB Path: ${dbpath}`);
