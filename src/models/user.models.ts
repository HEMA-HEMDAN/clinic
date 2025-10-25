import mongoose, { Document, Schema } from "mongoose";
import validator from "validator";

export type UserRole = "doctor" | "patient";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  specialization?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // hidden by default
    },
    phone: {
      type: String,
      validate: {
        validator: (v: string) => validator.isMobilePhone(v, "any"),
        message: "Please provide a valid phone number",
      },
    },
    role: {
      type: String,
      enum: {
        values: ["doctor", "patient"],
        message: "Role must be either doctor or patient",
      },
      required: [true, "User role is required"],
    },
    specialization: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.role === "doctor";
      },
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", userSchema);
export default UserModel;
