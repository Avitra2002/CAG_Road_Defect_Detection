import { apiClient } from "./apiClient";

export interface MaintenanceTeam {
  id: number;
  name: string;
}

export const maintenanceApi = {
  // Get all maintenance teams
  getTeams: async (): Promise<MaintenanceTeam[]> => {
    return await apiClient("/maintenance/teams");
  },
};
