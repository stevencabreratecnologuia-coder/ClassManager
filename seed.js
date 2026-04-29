import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "./src/models/user.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

const adminName = process.env.ADMIN_NAME || "Admin Juan";
const adminEmail = process.env.ADMIN_EMAIL || "AdminJuan@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD || "65771344";

const seedAdmin = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI no esta configurado.");
    process.exit(1);
  }

  await connectDB();

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        name: adminName,
        password: hashedPassword,
        rol: "Admin",
        estado: true,
      },
      $setOnInsert: {
        email: adminEmail,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  console.log("Cuenta admin lista:");
  console.log(`- Nombre: ${admin.name}`);
  console.log(`- Correo: ${admin.email}`);
  console.log(`- Rol: ${admin.rol}`);
  console.log(`- Password: ${adminPassword}`);

  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch(async (error) => {
  console.error("Error creando el admin:", error.message);

  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }

  process.exit(1);
});
