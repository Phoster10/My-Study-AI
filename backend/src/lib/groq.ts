import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  console.warn("[groq] GROQ_API_KEY is not set — AI-powered routes will fail at request time.");
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
export const CHAT_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
