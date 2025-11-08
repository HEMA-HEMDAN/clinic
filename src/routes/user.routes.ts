import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  getDoctors,
} from "../controllers/user.controller";
import { verifyToken } from "../middlewares/verifyToken";
import { allowTo } from "../middlewares/allowTo";

const router = Router();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/doctors", getDoctors);

// Protected
router.get("/", verifyToken, allowTo("doctor"), getAllUsers);
router.get("/:id", verifyToken, allowTo("doctor"), getUserById);

export default router;
