import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./src/config/db.js";
import { createOrSyncAdmin } from "./src/services/authService.js";

dotenv.config({ quiet: true });

const seedAdmin = async () => {
  if (!process.env.MONGO_URI && !process.env.MONGO_DIRECT_URI) {
    console.error("MONGO_URI o MONGO_DIRECT_URI no esta configurado.");
    process.exit(1);
  }

  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error("No fue posible conectar a MongoDB.");
    process.exit(1);
  }

  const admin = await createOrSyncAdmin();
  if (!admin) {
    console.error(
      "No se creo admin. Configura ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD.",
    );
    process.exit(1);
  }

  console.log("Cuenta admin lista:");
  console.log(`- Nombre: ${admin.name}`);
  console.log(`- Correo: ${admin.email}`);
  console.log(`- Rol: ${admin.rol}`);

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
