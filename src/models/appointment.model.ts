import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import User from "./user.models";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface IAppointmentAttributes {
  id?: number;
  patientId: number;
  doctorId: number;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAppointmentCreationAttributes
  extends Optional<
    IAppointmentAttributes,
    "id" | "status" | "createdAt" | "updatedAt"
  > {}

class Appointment
  extends Model<IAppointmentAttributes, IAppointmentCreationAttributes>
  implements IAppointmentAttributes
{
  public id!: number;
  public patientId!: number;
  public doctorId!: number;
  public startAt!: Date;
  public endAt!: Date;
  public durationMinutes!: number;
  public status!: AppointmentStatus;
  public reason?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public patient?: User;
  public doctor?: User;

  // Getter to expose id as _id for frontend compatibility
  public get _id(): string {
    return this.id.toString();
  }

  // Override toJSON to include _id field
  public toJSON() {
    const values: any = { ...this.get() };
    // Add _id field for frontend compatibility
    values._id = this.id.toString();
    // Remove id from response, use _id instead
    delete values.id;

    // Transform nested associations if they exist
    // Note: Controllers will handle the proper transformation of patientId/doctorId
    // when associations are loaded, but we ensure _id is present here
    if (values.patient) {
      values.patient._id =
        values.patient.id?.toString() || values.patientId?.toString();
      delete values.patient.id;
    }
    if (values.doctor) {
      values.doctor._id =
        values.doctor.id?.toString() || values.doctorId?.toString();
      delete values.doctor.id;
    }

    return values;
  }
}

Appointment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      validate: {
        notEmpty: {
          msg: "Patient is required",
        },
      },
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      validate: {
        notEmpty: {
          msg: "Doctor is required",
        },
      },
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "startAt is required",
        },
      },
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "endAt is required",
        },
      },
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [5],
          msg: "Minimum duration is 5 minutes",
        },
        max: {
          args: [480],
          msg: "Maximum duration is 480 minutes",
        },
        notEmpty: {
          msg: "durationMinutes is required",
        },
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: {
          args: [["pending", "confirmed", "cancelled", "completed"]],
          msg: "Invalid status",
        },
      },
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: "Reason is too long",
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "appointments",
    timestamps: true,
    indexes: [
      {
        fields: ["doctorId", "startAt", "endAt"],
        name: "appointment_doctor_time_index",
      },
    ],
  }
);

// Define associations
Appointment.belongsTo(User, {
  foreignKey: "patientId",
  as: "patient",
});

Appointment.belongsTo(User, {
  foreignKey: "doctorId",
  as: "doctor",
});

User.hasMany(Appointment, {
  foreignKey: "patientId",
  as: "patientAppointments",
});

User.hasMany(Appointment, {
  foreignKey: "doctorId",
  as: "doctorAppointments",
});

export default Appointment;
