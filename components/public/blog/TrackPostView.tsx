"use client";

import { useEffect, useRef } from "react";

export default function TrackPostView({ postId }: { postId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    fetch("/api/track/blog-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {});
  }, [postId]);

  return null;
}
