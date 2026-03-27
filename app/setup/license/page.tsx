"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileUp,
} from "lucide-react";

const EULA_VERSION = "1.0";

function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

interface LicenseResult {
  isLicensed: boolean;
  status: string;
  customerName?: string | null;
  product?: string | null;
  expiresAt?: string | null;
  activations?: number | null;
  maxActivations?: number | null;
  errorMessage?: string | null;
}

export default function LicenseActivationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"key" | "file">("key");
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LicenseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    // Check EULA first
    if (typeof window !== "undefined") {
      if (localStorage.getItem("nqrust_eula_accepted") !== EULA_VERSION) {
        router.replace("/setup");
        return;
      }
    }
    // Check if already licensed
    fetch("/api/license/status")
      .then((r) => r.json())
      .then((state: LicenseResult) => {
        if (state.isLicensed) {
          // Set license cookie and redirect
          document.cookie = "nqrust_license_status=valid;path=/;max-age=86400;samesite=lax";
          router.replace("/");
        }
      })
      .catch(() => {});
  }, [router]);

  function handleKeyChange(value: string) {
    const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const formatted = raw.match(/.{1,4}/g)?.join("-") || "";
    setLicenseKey(formatted.slice(0, 19));
  }

  async function activateKey() {
    setError(null);
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
      setError("Invalid format. Use XXXX-XXXX-XXXX-XXXX.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({ licenseKey }),
      });
      const data: LicenseResult = await res.json();
      if (data.isLicensed) {
        setResult(data);
        document.cookie = "nqrust_license_status=valid;path=/;max-age=86400;samesite=lax";
        setTimeout(() => router.push("/"), 1500);
      } else {
        setError(data.errorMessage || "Activation failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".lic")) {
      setError("Please upload a .lic file.");
      return;
    }
    setFileName(file.name);
    file.text().then(setFileContent);
  }

  async function uploadFile() {
    if (!fileContent) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/license/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({ fileContent }),
      });
      const data: LicenseResult = await res.json();
      if (data.isLicensed) {
        setResult(data);
        document.cookie = "nqrust_license_status=valid;path=/;max-age=86400;samesite=lax";
        setTimeout(() => router.push("/"), 1500);
      } else {
        setError(data.errorMessage || "Invalid license file.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-lg bg-muted mb-3">
            <Image
              src="/logo/nq-logo.png"
              alt="NQRust logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-sm"
              priority
            />
          </div>
          <h1 className="text-xl font-semibold">Activate License</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your license key or upload an offline license file.
          </p>
        </div>

        <Card className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "key"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("key")}
            >
              <Key className="inline h-3.5 w-3.5 mr-1.5" />
              License Key
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "file"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("file")}
            >
              <Upload className="inline h-3.5 w-3.5 mr-1.5" />
              Offline File
            </button>
          </div>

          {/* Key tab */}
          {tab === "key" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>License Key</Label>
                <Input
                  value={licenseKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={19}
                  className="text-center font-mono text-lg tracking-widest"
                  autoFocus
                />
              </div>
              <Button
                className="w-full"
                onClick={activateKey}
                disabled={loading || licenseKey.length < 19}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  "Activate License"
                )}
              </Button>
            </div>
          )}

          {/* File tab */}
          {tab === "file" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith(".lic")) {
                    setFileName(file.name);
                    file.text().then(setFileContent);
                  } else {
                    setError("Please upload a .lic file.");
                  }
                }}
              >
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {fileName || "Click to select or drag & drop"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts .lic files
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".lic"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <Button
                className="w-full"
                onClick={uploadFile}
                disabled={loading || !fileContent}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Activate"
                )}
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {result?.isLicensed && (
            <div className="mt-4 p-4 rounded-lg bg-status-healthy/10 border border-status-healthy/20 space-y-2">
              <div className="flex items-center gap-2 text-status-healthy font-medium text-sm">
                <CheckCircle className="h-4 w-4" />
                License activated successfully!
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                {result.customerName && (
                  <div>Customer: {result.customerName}</div>
                )}
                {result.product && <div>Product: {result.product}</div>}
                {result.expiresAt && <div>Expires: {result.expiresAt}</div>}
                {result.activations != null && (
                  <div>
                    Activations: {result.activations} / {result.maxActivations ?? "∞"}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Redirecting to dashboard...
              </div>
            </div>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          NQRust-InfraWatch &copy; Nexus Quantum Tech
        </p>
      </div>
    </div>
  );
}
