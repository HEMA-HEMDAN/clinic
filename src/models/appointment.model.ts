import mongoose, { Document, Schema } from "mongoose";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient is required"],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor is required"],
    },
    startAt: {
      type: Date,
      required: [true, "startAt is required"],
    },
    endAt: {
      type: Date,
      required: [true, "endAt is required"],
    },
    durationMinutes: {
      type: Number,
      required: [true, "durationMinutes is required"],
      min: [5, "Minimum duration is 5 minutes"],
      max: [480, "Maximum duration is 480 minutes"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "confirmed", "cancelled", "completed"],
        message: "Invalid status",
      },
      default: "pending",
    },
    reason: {
      type: String,
      maxlength: [500, "Reason is too long"],
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// index to speed overlap/conflict queries per doctor
appointmentSchema.index({ doctorId: 1, startAt: 1, endAt: 1 });

const AppointmentModel = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema
);
export default AppointmentModel;
