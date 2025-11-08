// src/services/appointment.service.ts
import Appointment, {
  IAppointmentAttributes,
} from "../models/appointment.model";
import User from "../models/user.models";
import dayjs from "dayjs";
import { Op } from "sequelize";

export function computeEndAt(startAt: Date, durationMinutes: number): Date {
  return dayjs(startAt).add(durationMinutes, "minute").toDate();
}

export async function doctorExists(doctorId: number | string): Promise<boolean> {
  const doctorIdNum = typeof doctorId === "string" ? parseInt(doctorId, 10) : doctorId;
  const doc = await User.findByPk(doctorIdNum);
  return !!doc && doc.role === "doctor";
}

/**
 * Check for overlapping appointments.
 * Overlap condition: existing.startAt < newEnd && existing.endAt > newStart
 */
export async function hasOverlap(
  doctorId: number | string,
  start: Date,
  end: Date,
  excludeId?: number | string
): Promise<boolean> {
  const doctorIdNum = typeof doctorId === "string" ? parseInt(doctorId, 10) : doctorId;
  
  const whereClause: any = {
    doctorId: doctorIdNum,
    status: { [Op.in]: ["pending", "confirmed"] },
    startAt: { [Op.lt]: end },
    endAt: { [Op.gt]: start },
  };

  if (excludeId) {
    const excludeIdNum = typeof excludeId === "string" ? parseInt(excludeId, 10) : excludeId;
    if (!isNaN(excludeIdNum)) {
      whereClause.id = { [Op.ne]: excludeIdNum };
    }
  }

  const conflict = await Appointment.findOne({
    where: whereClause,
  });

  return !!conflict;
}

export async function createAppointment(payload: {
  patientId: string | number;
  doctorId: string | number;
  startAt: string | Date;
  durationMinutes: number;
  reason?: string;
}): Promise<Appointment> {
  const { patientId, doctorId, startAt, durationMinutes, reason } = payload;

  const doctorIdNum = typeof doctorId === "string" ? parseInt(doctorId, 10) : doctorId;
  const patientIdNum = typeof patientId === "string" ? parseInt(patientId, 10) : patientId;

  if (isNaN(doctorIdNum) || !(await doctorExists(doctorIdNum))) {
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

  const overlap = await hasOverlap(doctorIdNum, start, end);
  if (overlap) {
    const e = new Error("Time slot conflict");
    (e as any).status = 409;
    throw e;
  }

  const appt = await Appointment.create({
    patientId: patientIdNum,
    doctorId: doctorIdNum,
    startAt: start,
    endAt: end,
    durationMinutes,
    reason,
    status: "pending",
  });

  return appt;
}
