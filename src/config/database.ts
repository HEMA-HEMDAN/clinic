import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

// Sequelize connection to CockroachDB using COCKROACH_URL from .env
const databaseUrl = process.env.COCKROACH_URL;

if (!databaseUrl) {
  throw new Error(
    "COCKROACH_URL environment variable is not set.\n" +
      "Please create a .env file in the root directory with:\n" +
      "COCKROACH_URL=postgresql://user:password@host:port/database?sslmode=verify-full"
  );
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false, // Set to console.log for debugging
});
