export function normalizedToPixel(value: number, size: number, markerRadius: number) {
  return Math.max(0, clamp(value) * size - markerRadius);
}

export function pixelToNormalized(value: number, size: number, markerRadius: number) {
  if (!Number.isFinite(size) || size <= 0) return 0;
  return clamp((value + markerRadius) / size);
}

export function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
