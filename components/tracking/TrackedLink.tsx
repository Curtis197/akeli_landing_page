"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackLandingEvent } from "@/lib/tracking/landing";

interface TrackedLinkProps {
  href: string;
  source: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Anchor used by server components (landing page) to record cta_click events.
export default function TrackedLink({ href, source, className, style, children }: TrackedLinkProps) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => trackLandingEvent("cta_click", { metadata: { source } })}
    >
      {children}
    </a>
  );
}
