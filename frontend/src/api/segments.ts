import { apiClient } from "./apiClient";


const parseSegment = (seg: any) => ({
  ...seg,
  lastInspected: seg.lastInspected ? new Date(seg.lastInspected) : null,
  coordinates: seg.coordinates || [],
  frequencyCount: Number(seg.frequencyCount ?? 0),
  defectCount: Number(seg.defectCount ?? 0),
});

export const segmentApi = {
  getAll: async () => {
    const segments = await apiClient("/segments");
    return segments.map(parseSegment);
    },
  getCritical: async () => {
    const segments = await apiClient("/segments/critical");
    return segments.map(parseSegment);
    },
  getAverageIRI: () => apiClient("/segments/iri-average"),

  getAboveThreshold: async (iriThreshold: number) => {
    const all = await apiClient("/segments");
    return all
      .map(parseSegment)
      .filter((s) => s.iri >= iriThreshold);
  }
};
