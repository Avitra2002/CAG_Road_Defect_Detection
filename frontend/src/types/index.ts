export type DefectType = 'pothole' | 'crack' | 'marking' | 'roughness';
export type DefectSeverity = 'critical' | 'high' | 'moderate' | 'low';
export type DefectStatus = 'for_checking' | 'checked' | 'false_positive' | 'assigned'|'in_progress' | 'for_review' | 'completed';
export type DefectPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface DefectImage {
  url: string;
  type?: string;
  capturedAt?: Date;
}

export interface RoadSegmentCoordinate {
  lat: number;
  lng: number;
}


export interface Defect {
  id: string;
  type: DefectType;
  severity: DefectSeverity;
  status: DefectStatus;
  priority?: DefectPriority;
  location: string;
  coordinates: { lat: number; lng: number };
  detectedAt: Date;
  reviewedAt?: Date | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  size?: number;
  image?: string;
  images?: DefectImage[];
  segment: string;
  zone: string;
  assignedMaintenanceTeamId?: number | null;
  assignedMaintenanceTeamName?: string | null;
  ageInDays?: number;
  isWorsening?: boolean;
  worseningData?: {
    previousSize: number;
    currentSize: number;
    previousImage?: string;
    checkDate: Date;
  };
  iri?: number;
  notes? : string;
}

export interface Vehicle {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  lastUpload?: Date;
  currentRoute?: string;
  uploadSize?: number;
  signal?: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  zone: string;
  length: number;
  iri: number;
  defectCount: number;
  lastInspected?: Date;
  isCritical?: boolean;
  frequencyCount?: number;
  lanes?: number;
  coordinates: RoadSegmentCoordinate[]; 
}

export interface MaintenanceActivity {
  id: string;
  defectId: string;
  team: string;
  status: 'assigned' | 'in_progress' | 'for_review' | 'completed';
  priority: DefectPriority;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  reviewedAt?: Date;
  durationHours?: number;
  notes?: string;
}

export interface OpsAssignment {
  id: string;
  defectId: string;
  opsTeam: string;
  assignedAt: Date;
  // status: 'for_checking' | 'checked' | 'escalated' | 'false_positive' | 'deleted';
  status: 'for_checking' | 'checked' | 'false_positive';
  notes?: string;
  deletingAt?: Date;
}