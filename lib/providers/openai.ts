import OpenAI from "openai";
import { CarCardData, normalizeCarCardData } from "../schema";
import { extractionPrompt } from "./prompt";

const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const extractJson = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  if (firstBrace >= 0) return text.slice(firstBrace).trim();
  return text.trim();
};

const parseContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item && "text" in item && typeof (item as { text?: string }).text === "string") {
          return (item as { text: string }).text;
        }
        return "";
      })
      .join(" ");
  }
  return "";
};

export const extractWithOpenAI = async (imageDataUrl: string): Promise<CarCardData> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: defaultModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are an OCR assistant that extracts structured car-card details. Return only valid JSON with the exact schema: {\"plate_number\":\"\",\"vin\":\"\",\"make\":\"\",\"model\":\"\",\"year\":\"\",\"color\":\"\",\"engine_number\":\"\",\"owner_name\":\"\",\"registration_date\":\"\",\"expiry_date\":\"\",\"country\":\"\",\"confidence\":{\"plate_number\":0,\"vin\":0,\"make\":0,\"model\":0,\"year\":0,\"color\":0,\"engine_number\":0,\"owner_name\":0,\"registration_date\":0,\"expiry_date\":0,\"country\":0},\"raw_text\":\"\"}. Use empty strings when data is missing. Confidence values are numbers between 0 and 1. Do not add extra keys or text."
      },
      {
        role: "user",
        content: [
          { type: "text", text: extractionPrompt },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  });
  const content = response.choices[0]?.message?.content;
  const text = parseContent(content);
  const jsonString = extractJson(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Model returned invalid JSON");
  }
  return normalizeCarCardData(parsed);
};
