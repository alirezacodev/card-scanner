"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import type { ExtractResponseShape } from "@/lib/schema";

export default function HomePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [response, setResponse] = useState<ExtractResponseShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerCamera = () => cameraInputRef.current?.click();
  const triggerUpload = () => uploadInputRef.current?.click();

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
    setResponse(null);
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const json = (await res.json()) as ExtractResponseShape;
      setResponse(json);
      if (!json.ok) {
        setError(json.error?.message || "Request failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setResponse({ ok: false, error: { message } });
    } finally {
      setLoading(false);
    }
  };

  const onCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = "";
  };

  const onUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = "";
  };

  return (
    <main>
      <section className="card">
        <h1>Car Card Extractor</h1>
        <p>Capture or upload a car card image to extract structured data.</p>
      </section>

      <section className="card">
        <div className="controls">
          <button onClick={triggerCamera} disabled={loading}>
            Take Picture
          </button>
          <button onClick={triggerUpload} disabled={loading}>
            Upload Picture
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          style={{ display: "none" }}
          onChange={onCameraChange}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          style={{ display: "none" }}
          onChange={onUploadChange}
        />
        {previewUrl && (
          <div className="preview" style={{ marginTop: 16 }}>
            <Image src={previewUrl} alt="Preview" width={72} height={72} className="preview-image" unoptimized />
            <span>Preview ready</span>
          </div>
        )}
        <div className="status" style={{ marginTop: 12 }}>
          {loading && <span>Sending image...</span>}
          {!loading && error && <span className="error">Error: {error}</span>}
          {!loading && !error && response?.ok && <span>Extraction complete</span>}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Response</h2>
        <pre className="json">
          {JSON.stringify(
            response ?? { ok: false, error: { message: "No request yet" } },
            null,
            2
          )}
        </pre>
      </section>
    </main>
  );
}

