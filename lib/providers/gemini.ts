import { GoogleGenAI } from "@google/genai";
import { normalizeCarCardData, type CarCardData } from "../schema";
import { extractionPrompt } from "./prompt";

const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const carCardJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    plate_number: { type: "string" },
    vin: { type: "string" },
    make: { type: "string" },
    model: { type: "string" },
    year: { type: "string" },
    color: { type: "string" },
    engine_number: { type: "string" },
    owner_name: { type: "string" },
    registration_date: { type: "string" },
    expiry_date: { type: "string" },
    country: { type: "string" },
    confidence: {
      type: "object",
      additionalProperties: false,
      properties: {
        plate_number: { type: "number", minimum: 0, maximum: 1 },
        vin: { type: "number", minimum: 0, maximum: 1 },
        make: { type: "number", minimum: 0, maximum: 1 },
        model: { type: "number", minimum: 0, maximum: 1 },
        year: { type: "number", minimum: 0, maximum: 1 },
        color: { type: "number", minimum: 0, maximum: 1 },
        engine_number: { type: "number", minimum: 0, maximum: 1 },
        owner_name: { type: "number", minimum: 0, maximum: 1 },
        registration_date: { type: "number", minimum: 0, maximum: 1 },
        expiry_date: { type: "number", minimum: 0, maximum: 1 },
        country: { type: "number", minimum: 0, maximum: 1 }
      },
      required: [
        "plate_number",
        "vin",
        "make",
        "model",
        "year",
        "color",
        "engine_number",
        "owner_name",
        "registration_date",
        "expiry_date",
        "country"
      ]
    },
    raw_text: { type: "string" }
  },
  required: [
    "plate_number",
    "vin",
    "make",
    "model",
    "year",
    "color",
    "engine_number",
    "owner_name",
    "registration_date",
    "expiry_date",
    "country",
    "confidence",
    "raw_text"
  ]
} as const;

type GeminiParams = {
  base64: string;
  mimeType: string;
  prompt?: string;
  schema?: unknown;
};

const extractResponseText = (response: unknown) => {
  const withText = response as { text?: unknown };
  if (typeof withText.text === "function") return (withText.text as () => string)();
  if (typeof withText.text === "string") return withText.text;
  const withNestedText = response as { response?: { text?: unknown } };
  if (typeof withNestedText.response?.text === "function") {
    return (withNestedText.response.text as () => string)();
  }
  if (typeof withNestedText.response?.text === "string") {
    return withNestedText.response.text;
  }
  return "";
};

export const extractWithGemini = async ({ base64, mimeType, prompt, schema }: GeminiParams): Promise<CarCardData> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt || extractionPrompt
          },
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ]
      }
    ],
    responseMimeType: "application/json",
    responseJsonSchema: schema || carCardJsonSchema
  } as any);
  const rawText = (response as { text?: string }).text ?? "";
  const text = rawText.trim().replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  if (!text) {
    const candidates = (response as { candidates?: unknown }).candidates;
    const details = candidates ? `: ${JSON.stringify(candidates)}` : "";
    throw new Error(`Gemini returned an empty response${details}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned non-JSON: " + text.slice(0, 500));
  }
  return normalizeCarCardData(parsed);
};
