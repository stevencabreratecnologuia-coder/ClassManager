import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
