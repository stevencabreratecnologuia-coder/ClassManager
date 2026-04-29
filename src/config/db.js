import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();
mongoose.set("bufferCommands", false);

const getDnsServers = () => {
  const configuredServers = String(
    process.env.MONGO_DNS_SERVERS || "8.8.8.8,1.1.1.1",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredServers.length ? configuredServers : ["8.8.8.8", "1.1.1.1"];
};

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URI no esta configurada.");
    return false;
  }

  const dnsServers = getDnsServers();
  dns.setServers(dnsServers);
  console.log("DNS para MongoDB:", dnsServers.join(", "));
  console.log("process.env.MONGO_URI:", process.env.MONGO_URI);
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("MongoDB Atlas conectado con MONGO_URI principal");
    return true;
  } catch (error) {
    console.error("Error al conectar DB con MONGO_URI principal:", error.message);
    console.warn(
      "El servidor seguira activo, pero las rutas que dependan de MongoDB pueden fallar.",
    );
    return false;
  }
};
