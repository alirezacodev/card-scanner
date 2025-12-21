import { Buffer } from "node:buffer";
import { NextResponse, type NextRequest } from "next/server";
import { extractFromImage } from "@/lib/extract";
import type { ExtractResponseShape } from "@/lib/schema";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    const body: ExtractResponseShape = { ok: false, error: { message: "Image is required" } };
    return NextResponse.json(body, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    const body: ExtractResponseShape = { ok: false, error: { message: "Unsupported file type" } };
    return NextResponse.json(body, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    const body: ExtractResponseShape = { ok: false, error: { message: "File too large" } };
    return NextResponse.json(body, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const data = await extractFromImage(dataUrl);
    const body: ExtractResponseShape = { ok: true, data };
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const body: ExtractResponseShape = { ok: false, error: { message } };
    return NextResponse.json(body, { status: 500 });
  }
}

