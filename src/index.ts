import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import appointmentRoutes from "./routes/appointment.routes";
const app = express();
app.use(cors());
app.use(express.json());

//routes
app.use("/auth", userRoutes);
app.use("/appointments", appointmentRoutes);
// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL!)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
