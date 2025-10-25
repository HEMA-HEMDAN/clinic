// src/services/appointment.service.ts
import AppointmentModel, { IAppointment } from "../models/appointment.model";
import UserModel from "../models/user.models";
import dayjs from "dayjs";
import mongoose from "mongoose";

export function computeEndAt(startAt: Date, durationMinutes: number): Date {
  return dayjs(startAt).add(durationMinutes, "minute").toDate();
}

export async function doctorExists(doctorId: string): Promise<boolean> {
  const doc = await UserModel.findById(doctorId).lean();
  return !!doc && doc.role === "doctor";
}

/**
 * Check for overlapping appointments.
 * Overlap condition: existing.startAt < newEnd && existing.endAt > newStart
 */
export async function hasOverlap(
  doctorId: string,
  start: Date,
  end: Date,
  excludeId?: string
): Promise<boolean> {
  const q: any = {
    doctorId: new mongoose.Types.ObjectId(doctorId),
    status: { $in: ["pending", "confirmed"] },
    startAt: { $lt: end },
    endAt: { $gt: start },
  };

  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    q._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  const conflict = await AppointmentModel.findOne(q).lean();
  return !!conflict;
}

export async function createAppointment(payload: {
  patientId: string;
  doctorId: string;
  startAt: string | Date;
  durationMinutes: number;
  reason?: string;
}): Promise<IAppointment> {
  const { patientId, doctorId, startAt, durationMinutes, reason } = payload;

  if (!(await doctorExists(doctorId))) {
    const e = new Error("Doctor not found");
    (e as any).status = 404;
    throw e;
  }

  const start = new Date(startAt);
  if (start <= new Date()) {
    const e = new Error("startAt must be in the future");
    (e as any).status = 400;
    throw e;
  }

  const end = computeEndAt(start, durationMinutes);

  const overlap = await hasOverlap(doctorId, start, end);
  if (overlap) {
    const e = new Error("Time slot conflict");
    (e as any).status = 409;
    throw e;
  }

  const appt = await AppointmentModel.create({
    patientId: new mongoose.Types.ObjectId(patientId),
    doctorId: new mongoose.Types.ObjectId(doctorId),
    startAt: start,
    endAt: end,
    durationMinutes,
    reason,
    status: "pending",
  } as Partial<IAppointment>);

  return appt;
}
