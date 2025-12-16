import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

const database = process.env.LOCAL_DATABASE_pass;

export const sequelize = new Sequelize("mydb", "root", database, {
  host: "localhost",
  dialect: "mysql",
  logging: false, // disable console logs
});
