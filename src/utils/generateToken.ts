import jwt from "jsonwebtoken";

interface UserPayload {
  _id: string;
  role: string;
}

export const generateToken = (payload: UserPayload): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d"; // default 7 days

  return jwt.sign(payload, secret, { expiresIn });
};
