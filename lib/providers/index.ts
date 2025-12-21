import type { CarCardData } from "../schema";
import { carCardJsonSchema, extractWithGemini } from "./gemini";
import { extractWithOpenAI } from "./openai";
import { extractionPrompt } from "./prompt";

const parseDataUrl = (dataUrl: string) => {
  const match = /^data:(.+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  return { mimeType: match[1], base64: match[2] };
};

export const extractFromImage = async (imageDataUrl: string): Promise<CarCardData> => {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }
    const { mimeType, base64 } = parseDataUrl(imageDataUrl);
    return extractWithGemini({ base64, mimeType, prompt: extractionPrompt, schema: carCardJsonSchema });
  }
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    return extractWithOpenAI(imageDataUrl);
  }
  throw new Error("Unsupported AI_PROVIDER");
};
