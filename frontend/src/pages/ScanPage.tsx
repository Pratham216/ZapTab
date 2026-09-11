import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadBill } from "../api/bills";
import { trackEvent } from "../lib/analytics";

export default function ScanPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError("Please upload an image (JPG, PNG, or WEBP). PDFs are not supported.");
      return;
    }

    setError(null);
    setUploading(true);
    trackEvent("receipt_scan_started", { fileName: file.name, fileSize: file.size });
    try {
      const { id } = await uploadBill(file);
      trackEvent("receipt_scan_completed", { billId: id });
      navigate(`/bill/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      trackEvent("receipt_scan_failed", { error: msg });
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const steps = [
    {
      title: "Snap or upload",
      body: "Add a clear photo of your restaurant bill.",
    },
    {
      title: "AI reads it",
      body: "Items, prices, and taxes are extracted automatically.",
    },
    {
      title: "Review & split",
      body: "Tweak anything, then share with friends to split.",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scan your bill</h2>
        <p className="text-neutral-400 mt-2 max-w-md">
          Take a photo or upload a receipt and we'll turn it into an editable,
          shareable bill in seconds.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`
          group relative overflow-hidden rounded-3xl border-2 border-dashed
          p-12 text-center cursor-pointer transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60
          ${
            dragOver
              ? "border-amber-400 bg-amber-400/10 scale-[1.01]"
              : "border-amber-500/35 bg-amber-500/5 hover:border-amber-400/60 hover:bg-amber-400/10"
          }
          ${uploading ? "pointer-events-none" : ""}
        `}
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-amber-500/8 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="relative flex flex-col items-center">
          {uploading ? (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <svg
                  className="h-8 w-8 animate-spin text-amber-400"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </span>
              <p className="mt-5 text-lg font-semibold text-neutral-100">
                Reading your receipt…
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                This usually takes a few seconds
              </p>
            </>
          ) : (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 transition-transform group-hover:scale-110">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  <path d="M12 3v13" />
                  <path d="M8 7l4-4 4 4" />
                </svg>
              </span>
              <p className="mt-5 text-lg font-semibold text-neutral-100">
                Tap to upload or drop a receipt
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                JPG or PNG, up to 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6">
        <p className="text-sm font-semibold text-neutral-200">How it works</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-3 sm:flex-col sm:gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-300">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
