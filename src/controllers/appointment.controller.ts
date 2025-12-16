// src/controllers/appointment.controller.ts
import { Request, Response } from "express";
import * as apptService from "../services/appointment.service";
import Appointment from "../models/appointment.model";
import User from "../models/user.models";
import { Op } from "sequelize";

/**
 * Helper function to transform appointment to response format with _id
 * This maintains frontend compatibility by transforming Sequelize associations
 * to match Mongoose populate format
 */

// this one because i was using mongo db but for some resone we need to work with sql
// who work with it today dah
function transformAppointmentToResponse(appt: Appointment) {
  const apptData: any = appt.toJSON();

  // Start with base appointment data
  // Convert IDs to strings for frontend compatibility (matching ObjectId string format)
  const result: any = {
    _id: apptData._id || appt.id.toString(),
    patientId: apptData.patientId
      ? apptData.patientId.toString()
      : apptData.patientId,
    doctorId: apptData.doctorId
      ? apptData.doctorId.toString()
      : apptData.doctorId,
    startAt: apptData.startAt,
    endAt: apptData.endAt,
    durationMinutes: apptData.durationMinutes,
    status: apptData.status,
    reason: apptData.reason,
    notes: apptData.notes,
    createdAt: apptData.createdAt,
    updatedAt: apptData.updatedAt,
  };

  // Transform nested patient association if present (from Sequelize include)
  // Mongoose populate replaces patientId with populated object, so we do the same
  if (apptData.patient) {
    result.patientId = {
      _id:
        apptData.patient._id ||
        apptData.patient.id?.toString() ||
        apptData.patientId?.toString(),
      name: apptData.patient.name,
      email: apptData.patient.email,
    };
  } else if (appt.patient) {
    // Fallback if patient is loaded but not in JSON
    result.patientId = {
      _id: appt.patient.id.toString(),
      name: appt.patient.name,
      email: appt.patient.email,
    };
  }

  // Transform nested doctor association if present (from Sequelize include)
  // Mongoose populate replaces doctorId with populated object, so we do the same
  if (apptData.doctor) {
    result.doctorId = {
      _id:
        apptData.doctor._id ||
        apptData.doctor.id?.toString() ||
        apptData.doctorId?.toString(),
      name: apptData.doctor.name,
      specialization: apptData.doctor.specialization,
    };
  } else if (appt.doctor) {
    // Fallback if doctor is loaded but not in JSON
    result.doctorId = {
      _id: appt.doctor.id.toString(),
      name: appt.doctor.name,
      specialization: appt.doctor.specialization,
    };
  }

  // Remove the separate patient/doctor properties if they exist
  delete result.patient;
  delete result.doctor;

  return result;
}

/**
 * Create appointment (patient)
 */
export async function createAppointment(req: Request, res: Response) {
  try {
    // Get user ID from token (middleware should set req.user with _id from JWT)
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // Extract user ID - handle both _id (from JWT) and id formats
    const userId = user._id || user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { doctorId, startAt, durationMinutes, reason } = req.body;

    // Service will handle string to number conversion
    const appt = await apptService.createAppointment({
      patientId: userId, // Can be string or number, service handles conversion
      doctorId, // Can be string or number, service handles conversion
      startAt,
      durationMinutes,
      reason,
    });

    // Reload with associations for proper response
    // query = "select * from appointments where id = :id"
    const appointmentWithAssociations = await Appointment.findByPk(appt.id, {
      include: [
        { model: User, as: "patient", attributes: ["id", "name", "email"] },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
    });

    return res.status(201).json({
      status: "success",
      appointment: appointmentWithAssociations
        ? transformAppointmentToResponse(appointmentWithAssociations)
        : transformAppointmentToResponse(appt),
    });
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

    // Extract user ID - handle both _id (from JWT) and id formats
    const userId = user._id || user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    // this is the where clause it's an object
    const whereClause: any = {};

    if (user.role === "doctor") {
      whereClause.doctorId = userId;
    } else {
      whereClause.patientId = userId;
    }

    // optional query params: from, to, status
    const { from, to, status } = req.query;
    if (from || to) {
      whereClause.startAt = {};
      if (from) whereClause.startAt[Op.gte] = new Date(String(from));
      if (to) whereClause.startAt[Op.lte] = new Date(String(to));
    }
    if (status) whereClause.status = String(status);

    // query = "select * from appointments where doctorId = :doctorId or patientId = :patientId and status in ('pending', 'confirmed') and startAt < :end and endAt > :start"
    // for the record we should make a switch case for the query params and build the where clause accordingly
    const appts = await Appointment.findAll({
      where: whereClause,
      order: [["startAt", "ASC"]],
      include: [
        { model: User, as: "patient", attributes: ["id", "name", "email"] },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
    });

    const appointmentsResponse = appts.map((appt) =>
      transformAppointmentToResponse(appt)
    );

    return res.json({
      status: "success",
      results: appointmentsResponse.length,
      appointments: appointmentsResponse,
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
    const appointmentId = id;
    // query = "select * from appointments where id = :id"
    // for the record also in this method we are not using one query only we are using three the first one to get the appointment
    // the second one to get the patient and the third one to get the doctor
    // then we make the response object pased on that
    const appt = await Appointment.findByPk(appointmentId, {
      include: [
        { model: User, as: "patient", attributes: ["id", "name", "email"] },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
    });

    if (!appt) return res.status(404).json({ message: "Not found" });

    const user = (req as any).user;
    const userId = user._id || user.id;
    // Check permissions
    if (user.role === "patient") {
      if (appt.patientId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (user.role === "doctor") {
      if (appt.doctorId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    return res.json({
      status: "success",
      appointment: transformAppointmentToResponse(appt),
    });
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
    const appointmentId = id;

    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body;
    // query = "select * from appointments where id = :id"
    const appt = await Appointment.findByPk(appointmentId);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const userId = user._id || user.id;

    // doctor actions
    if (user.role === "doctor") {
      if (appt.doctorId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (body.status) appt.status = body.status;
      if (body.notes !== undefined) appt.notes = body.notes;
    } else if (user.role === "patient") {
      // patient cancel
      if (appt.patientId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (body.action === "cancel") {
        const cutoffMinutes = Number(process.env.CANCEL_CUTOFF_MINUTES ?? 60);
        const now = new Date();
        const cutoff = new Date(appt.startAt.getTime() - cutoffMinutes * 60000);
        if (now > cutoff) {
          return res.status(400).json({
            message: `Cannot cancel within ${cutoffMinutes} minutes`,
          });
        }
        appt.status = "cancelled";
      } else {
        return res.status(400).json({ message: "Invalid action" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    await appt.save();

    // Reload with associations for proper response
    // query = "update appointments set status = :status, notes = :notes where id = :id"
    const updatedAppt = await Appointment.findByPk(appt.id, {
      include: [
        { model: User, as: "patient", attributes: ["id", "name", "email"] },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
    });

    return res.json({
      status: "success",
      appointment: updatedAppt
        ? transformAppointmentToResponse(updatedAppt)
        : transformAppointmentToResponse(appt),
    });
  } catch (err: any) {
    console.error("updateAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
