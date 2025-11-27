import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

// put your pass here
const database = process.env.LOCAL_DATABASE_pass;

// if (!databaseUrl) {
//   throw new Error(
//     "COCKROACH_URL environment variable is not set.\n" +
//       "Please create a .env file in the root directory with:\n" +
//       "COCKROACH_URL=postgresql://user:password@host:port/database?sslmode=verify-full"
//   );
// }

export const sequelize = new Sequelize("mydb", "root", database, {
  host: "localhost",
  dialect: "mysql",
  logging: false, // disable console logs
});
