"use client";

import { useReducer } from "react";
import { ImagePreviewView } from "./image-preview-view";

/** The preview's state transition: once an image failed to load, it stays failed. */
export function markImageFailed(): boolean {
  return true;
}

/**
 * Thin client wrapper (spec A15): it only holds whether the image failed to load and renders
 * the view, so it has no branches. Render it with `key={url}` so a new address starts fresh.
 */
export function ImagePreview({ url, name }: { url: string; name: string }) {
  const [failed, onError] = useReducer(markImageFailed, false);
  return <ImagePreviewView url={url} name={name} failed={failed} onError={onError} />;
}
