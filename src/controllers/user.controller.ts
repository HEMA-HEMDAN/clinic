import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import UserModel, { IUser } from "../models/user.models";
import { generateToken } from "../utils/generateToken";

/**
 * Register user (doctor | patient)
 * Hashing done here intentionally for clarity (as you requested)
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, phone, specialization } = req.body;

    // basic validation (model will also validate)
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await UserModel.findOne({ email }).lean();
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email,
      password: hashed,
      role,
      phone,
      specialization,
    } as Partial<IUser>);

    const token = generateToken({ _id: user._id.toString(), role: user.role });

    return res.status(201).json({
      status: "success",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          specialization: user.specialization,
        },
        token,
      },
    });
  } catch (err: any) {
    // If duplicate key error from mongoose
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error("registerUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

/**
 * Login user
 */
export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing credentials" });

    // select password explicitly (schema sets select: false)
    const user = await UserModel.findOne({ email }).select("+password").exec();
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, (user as any).password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = generateToken({ _id: user._id.toString(), role: user.role });

    // send safe fields only
    return res.status(200).json({
      status: "success",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          specialization: user.specialization,
        },
        token,
      },
    });
  } catch (err: any) {
    console.error("loginUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

/**
 * Get all users (example protected route — use allowTo middleware)
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await UserModel.find().select("-password").lean();
    return res
      .status(200)
      .json({ status: "success", results: users.length, users });
  } catch (err: any) {
    console.error("getAllUsers error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

/**
 * Get user by id
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const user = await UserModel.findById(id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ status: "success", user });
  } catch (err: any) {
    console.error("getUserById error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}
