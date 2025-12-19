import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import appointmentRoutes from "./routes/appointment.routes";
import { sequelize } from "./config/database";

const app = express();
app.use(cors());
app.use(express.json());

//routes
app.use("/auth", userRoutes);
app.use("/appointments", appointmentRoutes);
app.use((req, res) => res.status(404).json({ message: "Not found" }));
// Import models to ensure they are registered with Sequelize
import "./models/user.models";
import "./models/appointment.model";

// Test connection and sync models
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Connected to db");
    // if we need to add new tables or alter existing tables we use { alter: true } or { force: true } for development)
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    console.log("✅ Database models synchronized");
  })
  .catch((err) => {
    console.error("❌DB connection failed:", err);
  });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
