// src/controllers/appointment.controller.ts
import { Request, Response } from "express";
import * as apptService from "../services/appointment.service";
import AppointmentModel from "../models/appointment.model";
import mongoose from "mongoose";

/**
 * Create appointment (patient)
 */
export async function createAppointment(req: Request, res: Response) {
  try {
    const patientId =
      (req as any).user?._id ||
      (req as any).user?._id ||
      (req as any).user?._id; // whichever shape you attached
    // In earlier middleware we attached { _id, role } or { id, role } - handle both
    const userId =
      (req as any).user?._id ?? (req as any).user?.id ?? (req as any).user?.sub;
    const { doctorId, startAt, durationMinutes, reason } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const appt = await apptService.createAppointment({
      patientId: userId,
      doctorId,
      startAt,
      durationMinutes,
      reason,
    });

    return res.status(201).json({ status: "success", appointment: appt });
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || "Server error" });
  }
}

/**
 * List appointments for current user (doctor sees their, patient sees theirs)
 */
export async function listAppointments(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const filter: any = {};
    // support both shapes: { _id, role } or { id, role }
    const userId = user._id ?? user.id ?? user.sub;

    if (user.role === "doctor")
      filter.doctorId = new mongoose.Types.ObjectId(userId);
    else filter.patientId = new mongoose.Types.ObjectId(userId);

    // optional query params: from, to, status
    const { from, to, status } = req.query;
    if (from || to) {
      filter.startAt = {};
      if (from) filter.startAt.$gte = new Date(String(from));
      if (to) filter.startAt.$lte = new Date(String(to));
    }
    if (status) filter.status = String(status);

    const appts = await AppointmentModel.find(filter)
      .sort({ startAt: 1 })
      .populate("patientId", "name email")
      .populate("doctorId", "name specialization")
      .lean();

    return res.json({
      status: "success",
      results: appts.length,
      appointments: appts,
    });
  } catch (err: any) {
    console.error("listAppointments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Get appointment by id with permission checks
 */
export async function getAppointmentById(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });

    const appt = await AppointmentModel.findById(id)
      .populate("patientId", "name email")
      .populate("doctorId", "name specialization")
      .exec();

    if (!appt) return res.status(404).json({ message: "Not found" });

    const user = (req as any).user;
    const userId = user._id ?? user.id ?? user.sub;

    if (
      user.role === "patient" &&
      appt.patientId._id.toString() !== String(userId)
    )
      return res.status(403).json({ message: "Forbidden" });

    if (
      user.role === "doctor" &&
      appt.doctorId._id.toString() !== String(userId)
    )
      return res.status(403).json({ message: "Forbidden" });

    return res.json({ status: "success", appointment: appt });
  } catch (err: any) {
    console.error("getAppointmentById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Update appointment (doctor can change status/notes; patient can cancel via { action: 'cancel' })
 */
export async function updateAppointment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const user = (req as any).user;
    const body = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });

    const appt = await AppointmentModel.findById(id);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const userId = user._id ?? user.id ?? user.sub;

    // doctor actions
    if (user.role === "doctor") {
      if (String(appt.doctorId) !== String(userId))
        return res.status(403).json({ message: "Forbidden" });
      if (body.status) appt.status = body.status;
      if (body.notes) appt.notes = body.notes;
    } else if (user.role === "patient") {
      // patient cancel
      if (String(appt.patientId) !== String(userId))
        return res.status(403).json({ message: "Forbidden" });
      if (body.action === "cancel") {
        const cutoffMinutes = Number(process.env.CANCEL_CUTOFF_MINUTES ?? 60);
        const now = new Date();
        const cutoff = new Date(appt.startAt.getTime() - cutoffMinutes * 60000);
        if (now > cutoff)
          return res
            .status(400)
            .json({ message: `Cannot cancel within ${cutoffMinutes} minutes` });
        appt.status = "cancelled";
      } else {
        return res.status(400).json({ message: "Invalid action" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    await appt.save();
    return res.json({ status: "success", appointment: appt });
  } catch (err: any) {
    console.error("updateAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
