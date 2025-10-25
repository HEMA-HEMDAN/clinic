// src/routes/appointment.routes.ts
import { Router } from "express";
import {
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointment,
} from "../controllers/appointment.controller";
import { verifyToken } from "../middlewares/verifyToken";
import { allowTo } from "../middlewares/allowTo";

const router = Router();

router.use(verifyToken); // all appointment routes require auth

// patient creates
router.post("/", allowTo("patient"), createAppointment);

// list for current user (patient or doctor)
router.get("/", allowTo("patient", "doctor"), listAppointments);

// get one (patient or doctor)
router.get("/:id", allowTo("patient", "doctor"), getAppointmentById);

// update (doctor or patient)
router.patch("/:id", allowTo("patient", "doctor"), updateAppointment);

export default router;
