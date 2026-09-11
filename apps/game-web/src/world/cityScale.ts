export function cityVisualKm(radiusKm: number): number {
  return Math.min(260, Math.max(140, radiusKm * 6));
}
