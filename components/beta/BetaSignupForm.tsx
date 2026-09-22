"use client";

import { useState } from "react";

type Props = {
  emailLabel: string;
  emailPlaceholder: string;
  platformLabel: string;
  platformIos: string;
  platformAndroid: string;
  submitLabel: string;
  successMessage: string;
  alreadySignedUpMessage: string;
  errorMessage: string;
};

export function BetaSignupForm(props: Props) {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "already" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, platform }),
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setStatus(data.error === "already_signed_up" ? "already" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-base" style={{ color: "var(--color-brand-forest)" }}>
        {props.successMessage}
      </p>
    );
  }
  if (status === "already") {
    return (
      <p className="text-base" style={{ color: "var(--color-brand-forest)" }}>
        {props.alreadySignedUpMessage}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="beta-email" className="block text-sm font-medium mb-1" style={{ color: "var(--color-brand-dark)" }}>
          {props.emailLabel}
        </label>
        <input
          id="beta-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={props.emailPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium mb-1" style={{ color: "var(--color-brand-dark)" }}>
          {props.platformLabel}
        </span>
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input type="radio" name="platform" checked={platform === "ios"} onChange={() => setPlatform("ios")} />
            {props.platformIos}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="platform"
              checked={platform === "android"}
              onChange={() => setPlatform("android")}
            />
            {props.platformAndroid}
          </label>
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm" role="alert" style={{ color: "#c0392b" }}>
          {props.errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg px-4 py-2 font-bold text-white"
        style={{ backgroundColor: "var(--color-brand-dark)" }}
      >
        {props.submitLabel}
      </button>
    </form>
  );
}
