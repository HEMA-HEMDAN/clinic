import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import validator from "validator";

export type UserRole = "doctor" | "patient";

export interface IUserAttributes {
  id?: number;
  name: string;
  email: string;
  password: string;
  imgLink?: string;
  phone?: string;
  role: UserRole;
  specialization?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserCreationAttributes
  extends Optional<IUserAttributes, "id" | "createdAt" | "updatedAt"> {}

class User
  extends Model<IUserAttributes, IUserCreationAttributes>
  implements IUserAttributes
{
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public imgLink?: string;
  public phone?: string;
  public role!: UserRole;
  public specialization?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

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
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [3, Infinity],
          msg: "Name must be at least 3 characters long",
        },
        notEmpty: {
          msg: "User name is required",
        },
      },
    },
    imgLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Please provide a valid email",
        },
        notEmpty: {
          msg: "Email is required",
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, Infinity],
          msg: "Password must be at least 6 characters long",
        },
        notEmpty: {
          msg: "Password is required",
        },
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhone(value: string | null) {
          if (value && !validator.isMobilePhone(value, "any")) {
            throw new Error("Please provide a valid phone number");
          }
        },
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [["doctor", "patient"]],
          msg: "Role must be either doctor or patient",
        },
        notEmpty: {
          msg: "User role is required",
        },
      },
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: true,
      // Validation for required specialization for doctors is handled in model hooks
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeCreate: (user: User) => {
        // Convert email to lowercase
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
        // Trim name
        if (user.name) {
          user.name = user.name.trim();
        }
        // Trim specialization if provided
        if (user.specialization) {
          user.specialization = user.specialization.trim();
        }
        // Validate specialization for doctors
        if (user.role === "doctor" && !user.specialization) {
          throw new Error("Specialization is required for doctors");
        }
      },
      beforeUpdate: (user: User) => {
        // Convert email to lowercase on update
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
        // Trim name
        if (user.name) {
          user.name = user.name.trim();
        }
        // Trim specialization if provided
        if (user.specialization) {
          user.specialization = user.specialization.trim();
        }
        // Validate specialization for doctors
        if (user.role === "doctor" && !user.specialization) {
          throw new Error("Specialization is required for doctors");
        }
      },
    },
  }
);

export default User;
