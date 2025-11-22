import { apiClient } from "./apiClient";

const parseDefect = (d: any) => ({
  ...d,

  detectedAt: d.detectedAt ? new Date(d.detectedAt) : null,
  assignedAt: d.assignedAt ? new Date(d.assignedAt) : null,
  startedAt: d.startedAt ? new Date(d.startedAt) : null,
  reviewedAt: d.reviewedAt ? new Date(d.reviewedAt) : null,
  completedAt: d.completedAt ? new Date(d.completedAt) : null,
});

export const defectApi = {
  // Get all defects
  getAll: async () => {
    const list = await apiClient("/defects");
    return list.map(parseDefect);
  },

  // Get 1 defect by ID
  getById: async (id: number) => {
    const d = await apiClient(`/defects/${id}`);
    return parseDefect(d);
  },

  // Get defects waiting for checking
  getUnassigned: async () => {
    const list = await apiClient("/defects/unassigned");
    return list.map(parseDefect);
  },

  // Get urgent/high priority defects
  getUrgent: async () => {
    const list = await apiClient("/defects/urgent");
    return list.map(parseDefect);
  },

  // Get non-completed, non-false-positive defects
  getActive: async () => {
    const list = await apiClient("/defects/active");
    return list.map(parseDefect);
  },

  // Update defect.status
  updateStatus: async (id: number, status: string) => {
    const d = await apiClient(`/defects/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
    return parseDefect(d);
    },

  // assign maintenance team
  assignMaintenance: (id: number, teamId: number, priority: string) =>
    apiClient(`/defects/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ teamId, priority }),
    }),

  //delete defect
  delete: (id: number) =>
    apiClient(`/defects/${id}/delete`, {
      method: "DELETE"
    }),
};
