import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.models";
import { generateToken } from "../utils/generateToken";

/**
 * Helper function to transform user to response format with _id
 */
function transformUserToResponse(user: User) {
  const userData = user.toJSON();
  return {
    _id: userData._id || user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || undefined,
    specialization: user.specialization || undefined,
    imgLink: user.imgLink || undefined,
  };
}

/**
 * Register user (doctor | patient)
 * Hashing done here intentionally for clarity (as you requested)
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, phone, specialization, imgLink } =
      req.body;

    // basic validation (model will also validate)
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    // query = "select email from users where email = :email"
    const existing = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    // query = "insert into users (name, email, password, role, phone, specialization, imgLink) values (:name, :email, :password, :role ,:phone, :specialization, :imgLink)"
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      phone,
      specialization,
      imgLink,
    });

    const token = generateToken({ _id: user.id.toString(), role: user.role });

    return res.status(201).json({
      status: "success",
      data: {
        user: transformUserToResponse(user),
        token,
      },
    });
  } catch (err: any) {
    // If duplicate key error from Sequelize
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already registered" });
    }
    // Handle validation errors
    if (err.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ message: err.errors?.[0]?.message || "Validation error" });
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

    // query = "select * from users where email = :email"
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = generateToken({ _id: user.id.toString(), role: user.role });

    // send safe fields only
    return res.status(200).json({
      status: "success",
      data: {
        user: transformUserToResponse(user),
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
// update user
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, role, phone, specialization, imgLink } = req.body;
    // query = "select * from users where id = :id"
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // this one we already have the user so we don't make a new query to update we just update it here this when we write save it update
    // on it's own but this is the query for it query = "update users set name = :name, email = :email, role = :role, phone = :phone, specialization = :specialization, imgLink = :imgLink where id = :id"
    user.name = name || user.name;
    user.email = user.email;
    user.role = role || user.role;
    user.phone = phone || user.phone;
    user.specialization = specialization || user.specialization;
    user.imgLink = imgLink || user.imgLink;

    await user.save();

    return res.status(200).json({
      status: "success",
      user: transformUserToResponse(user),
    });
  } catch (err: any) {
    console.error("updateUser error:", err);
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
    // query = "select * from users"
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
    });

    const usersResponse = users.map((user) => transformUserToResponse(user));

    return res.status(200).json({
      status: "success",
      results: usersResponse.length,
      users: usersResponse,
    });
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
    const userId = id;
    // query = "select * from users where id = :id"
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      status: "success",
      user: transformUserToResponse(user),
    });
  } catch (err: any) {
    console.error("getUserById error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}

export async function getDoctors(req: Request, res: Response) {
  try {
    // query = "select * from users where role = 'doctor'"
    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: { exclude: ["password"] },
    });

    const doctorsResponse = doctors.map((user) =>
      transformUserToResponse(user)
    );

    return res.status(200).json({
      status: "success",
      results: doctorsResponse.length,
      doctors: doctorsResponse,
    });
  } catch (err: any) {
    console.error("getDoctors error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}
