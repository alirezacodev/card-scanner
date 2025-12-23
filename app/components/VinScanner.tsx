"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export default function VinScanner() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawOcrText, setRawOcrText] = useState<string>("");
  const [detectedVin, setDetectedVin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Cleanup object URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Reset state
    setImageFile(file);
    setDetectedVin("");
    setRawOcrText("");
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Reset input value to allow selecting the same file again
    event.target.value = "";
  };

  const extractVin = (text: string): string | null => {
    // VIN regex: 17 characters, A-Z0-9 excluding I, O, Q
    const vinRegex = /\bNA[A-Z0-9]{15}\b/;
    const match = text.match(vinRegex);
    return match ? match[0] : null;
  };

  // Analyze image brightness and contrast
  const analyzeImage = (imageData: ImageData): { brightness: number; contrast: number } => {
    const data = imageData.data;
    let sum = 0;
    let sumSquared = 0;
    const pixelCount = data.length / 4; // RGBA, so divide by 4

    // Calculate average brightness (luminance)
    for (let i = 0; i < data.length; i += 4) {
      // Calculate luminance using standard formula: 0.299*R + 0.587*G + 0.114*B
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += luminance;
      sumSquared += luminance * luminance;
    }

    const averageBrightness = sum / pixelCount;
    const variance = sumSquared / pixelCount - averageBrightness * averageBrightness;
    const contrast = Math.sqrt(variance); // Standard deviation as contrast measure

    return {
      brightness: averageBrightness / 255, // Normalize to 0-1
      contrast: contrast / 255, // Normalize to 0-1
    };
  };

  // Enhance image brightness and contrast
  const enhanceImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { brightness, contrast } = analyzeImage(imageData);

        // Thresholds: if brightness < 0.4 or contrast < 0.2, enhance
        const needsEnhancement = brightness < 0.4 || contrast < 0.2;

        if (needsEnhancement) {
          // Apply brightness and contrast enhancement
          const data = imageData.data;
          const brightnessFactor = brightness < 0.4 ? (0.5 - brightness) * 1.5 : 0; // Boost brightness
          const contrastFactor = contrast < 0.2 ? (0.3 - contrast) * 2 : 0; // Boost contrast

          for (let i = 0; i < data.length; i += 4) {
            // Enhance brightness
            if (brightnessFactor > 0) {
              data[i] = Math.min(255, data[i] + brightnessFactor * 255); // R
              data[i + 1] = Math.min(255, data[i + 1] + brightnessFactor * 255); // G
              data[i + 2] = Math.min(255, data[i + 2] + brightnessFactor * 255); // B
            }

            // Enhance contrast using linear transformation
            if (contrastFactor > 0) {
              const factor = 1 + contrastFactor;
              const intercept = 128 * (1 - factor);
              data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept)); // R
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept)); // G
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept)); // B
            }
          }

          // Put enhanced image data back
          ctx.putImageData(imageData, 0, 0);
        }

        // Convert canvas to blob, then to File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"));
              return;
            }
            // Create a new File from the blob
            const enhancedFile = new File(
              [blob],
              file.name,
              {
                type: file.type || "image/png",
                lastModified: Date.now(),
              }
            );
            resolve(enhancedFile);
          },
          file.type || "image/png",
          0.95
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Crop a guided region where the VIN typically appears (bottom portion, centered)
  const cropToVinRegion = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Define crop region relative to the image size
        const cropWidth = img.width * 0.9; // 90% width, centered
        const cropHeight = img.height * 0.35; // bottom 35%
        const cropX = (img.width - cropWidth) / 2;
        const cropY = img.height * 0.55; // start a bit past halfway down

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from crop"));
              return;
            }
            const croppedFile = new File([blob], file.name, {
              type: file.type || "image/png",
              lastModified: Date.now()
            });
            resolve(croppedFile);
          },
          file.type || "image/png",
          0.95
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for cropping"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleScanVin = async () => {
    if (!imageFile) {
      setError("Please upload an image first");
      return;
    }

    setLoading(true);
    setError(null);
    setDetectedVin("");
    setRawOcrText("");

    try {
      // Preprocess image: crop to VIN region, then enhance brightness/contrast if needed
      let processedFile = imageFile;
      try {
        const cropped = await cropToVinRegion(imageFile);
        processedFile = await enhanceImage(cropped);
      } catch (enhanceError) {
        console.warn("Image crop/enhance failed, using original:", enhanceError);
        // Continue with original file if preprocessing fails
        processedFile = imageFile;
      }

      // Dynamically import Tesseract to avoid bundling in main JS
      const { createWorker } = await import("tesseract.js");

      // Create and initialize worker
      const worker = await createWorker("eng");

      try {
        // Perform OCR on the processed image file
        const {
          data: { text },
        } = await worker.recognize(processedFile);

        setRawOcrText(text);

        // Extract VIN from OCR text
        const vin = extractVin(text);

        if (vin) {
          setDetectedVin(vin);
        } else {
          setError("No VIN found in the image. Please ensure the VIN is clearly visible.");
        }
      } finally {
        // Terminate worker to free resources
        await worker.terminate();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process image";
      setError(message);
      console.error("OCR error:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <section className="card">
        <h1>VIN Scanner</h1>
        <p>Upload an image containing a VIN to extract it using OCR.</p>
      </section>

      <section className="card">
        <div className="controls">
          <button onClick={triggerFileInput} disabled={loading}>
            {imageFile ? "Change Image" : "Upload Image"}
          </button>
          <button
            onClick={handleScanVin}
            disabled={loading || !imageFile}
          >
            {loading ? "Scanning..." : "Scan VIN"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          style={{ display: "none" }}
          onChange={handleFileChange}
          aria-label="Upload image file"
        />

        {previewUrl && (
          <div className="preview" style={{ marginTop: 16 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <Image
                src={previewUrl}
                alt="Image preview"
                width={260}
                height={180}
                className="preview-image"
                unoptimized
                style={{ width: "auto", height: "180px", maxWidth: "100%" }}
              />
              {/* Visual guide rectangle to frame the VIN area (bottom band) */}
              <div
                style={{
                  position: "absolute",
                  left: "5%",
                  right: "5%",
                  bottom: "10%",
                  height: "20%",
                  border: "2px dashed rgba(255,255,255,0.65)",
                  borderRadius: 12,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                  pointerEvents: "none"
                }}
                aria-hidden="true"
              />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {imageFile?.name}
              </div>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                {Math.round((imageFile?.size ?? 0) / 1024)} KB
              </div>
            </div>
          </div>
        )}

        <div className="status" style={{ marginTop: 12 }}>
          {loading && <span>Processing image with OCR...</span>}
          {!loading && error && (
            <span className="error">Error: {error}</span>
          )}
          {!loading && !error && detectedVin && (
            <span style={{ color: "#4ade80" }}>VIN detected successfully!</span>
          )}
        </div>
      </section>

      {detectedVin && (
        <section className="card">
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Detected VIN</h2>
          <input
            type="text"
            value={detectedVin}
            onChange={(e) => setDetectedVin(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #1f2937",
              background: "#0b1220",
              color: "#e2e8f0",
              fontFamily: "ui-monospace, monospace",
              fontSize: "16px",
              letterSpacing: "2px",
            }}
            aria-label="Detected VIN"
          />
        </section>
      )}

      {rawOcrText && (
        <section className="card">
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>OCR Text</h2>
          <pre className="json" style={{ maxHeight: "300px", overflow: "auto" }}>
            {rawOcrText}
          </pre>
        </section>
      )}
    </div>
  );
}

