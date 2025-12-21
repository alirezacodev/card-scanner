import assert from "node:assert";
import { confidenceKeys, emptyCarCardData, normalizeCarCardData } from "./schema";

const sampleInput = {
  vin: "NAAM123456789",
  engine_number: "۱۲۳۴۵",
  model: "405GLX-XU7-CNG",
  confidence: {
    vin: 1.2,
    engine_number: 0.9,
    model: 0.6,
    color: -0.1,
    extra: 0.8
  },
  raw_text: "line one\nخط دوم",
  extra_field: "ignored"
};

const normalized = normalizeCarCardData(sampleInput);

const expectedTopKeys = Object.keys(emptyCarCardData).sort();
assert.deepStrictEqual(Object.keys(normalized).sort(), expectedTopKeys);

const expectedConfidenceKeys = [...confidenceKeys].sort();
assert.deepStrictEqual(Object.keys(normalized.confidence).sort(), expectedConfidenceKeys);

assert.strictEqual(normalized.vin, "NAAM123456789");
assert.strictEqual(normalized.engine_number, "۱۲۳۴۵");
assert.strictEqual(normalized.model, "405GLX-XU7-CNG");
assert.strictEqual(normalized.color, "");
assert.strictEqual(normalized.raw_text, "line one\nخط دوم");
assert.strictEqual(normalized.confidence.vin, 1);
assert.strictEqual(normalized.confidence.engine_number, 0.9);
assert.strictEqual(normalized.confidence.model, 0.6);
assert.strictEqual(normalized.confidence.color, 0);
assert.strictEqual(normalized.confidence.plate_number, 0);
