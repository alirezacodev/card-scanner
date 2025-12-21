export type ConfidenceKey =
  | "plate_number"
  | "vin"
  | "make"
  | "model"
  | "year"
  | "color"
  | "engine_number"
  | "owner_name"
  | "registration_date"
  | "expiry_date"
  | "country"
  // NEW (back-card common fields)
  | "vehicle_type"
  | "fuel"
  | "capacity";

export type ConfidenceMap = Record<ConfidenceKey, number>;

export type CarCardData = {
  plate_number: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  color: string;
  engine_number: string;
  owner_name: string;
  registration_date: string;
  expiry_date: string;
  country: string;

  // NEW
  vehicle_type: string; // نوع
  fuel: string; // سوخت
  capacity: string; // ظرفیت (keep as string like "5 نفر")

  confidence: ConfidenceMap;
  raw_text: string;
};

export const confidenceKeys: ConfidenceKey[] = [
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
  // NEW
  "vehicle_type",
  "fuel",
  "capacity"
];

export const emptyCarCardData: CarCardData = {
  plate_number: "",
  vin: "",
  make: "",
  model: "",
  year: "",
  color: "",
  engine_number: "",
  owner_name: "",
  registration_date: "",
  expiry_date: "",
  country: "",

  // NEW
  vehicle_type: "",
  fuel: "",
  capacity: "",

  confidence: {
    plate_number: 0,
    vin: 0,
    make: 0,
    model: 0,
    year: 0,
    color: 0,
    engine_number: 0,
    owner_name: 0,
    registration_date: 0,
    expiry_date: 0,
    country: 0,
    // NEW
    vehicle_type: 0,
    fuel: 0,
    capacity: 0
  },
  raw_text: ""
};

const clamp = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
};

export const normalizeCarCardData = (input: unknown): CarCardData => {
  if (!input || typeof input !== "object") return emptyCarCardData;
  const data = input as Record<string, unknown>;

  const result: CarCardData = {
    plate_number: typeof data.plate_number === "string" ? data.plate_number : "",
    vin: typeof data.vin === "string" ? data.vin : "",
    make: typeof data.make === "string" ? data.make : "",
    model: typeof data.model === "string" ? data.model : "",
    year: typeof data.year === "string" ? data.year : "",
    color: typeof data.color === "string" ? data.color : "",
    engine_number: typeof data.engine_number === "string" ? data.engine_number : "",
    owner_name: typeof data.owner_name === "string" ? data.owner_name : "",
    registration_date: typeof data.registration_date === "string" ? data.registration_date : "",
    expiry_date: typeof data.expiry_date === "string" ? data.expiry_date : "",
    country: typeof data.country === "string" ? data.country : "",

    // NEW
    vehicle_type: typeof data.vehicle_type === "string" ? data.vehicle_type : "",
    fuel: typeof data.fuel === "string" ? data.fuel : "",
    capacity: typeof data.capacity === "string" ? data.capacity : "",

    confidence: { ...emptyCarCardData.confidence },
    raw_text: typeof data.raw_text === "string" ? data.raw_text : ""
  };

  const confidence = (data.confidence ?? {}) as Record<string, unknown>;
  for (const key of confidenceKeys) {
    result.confidence[key] = clamp(confidence[key]);
  }

  // If any string field is empty, force confidence to 0 (optional but helpful)
  for (const key of confidenceKeys) {
    // Map confidence key -> data field of same name
    const v = (result as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim() === "") result.confidence[key] = 0;
  }

  return result;
};

export type ExtractSuccess = { ok: true; data: CarCardData };
export type ExtractFailure = { ok: false; error: { message: string; details?: unknown } };
export type ExtractResponseShape = ExtractSuccess | ExtractFailure;
