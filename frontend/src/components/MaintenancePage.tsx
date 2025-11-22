import { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MaintenanceActivity, Defect } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Users, Calendar, TrendingUp, List, MapPin, Image as ImageIcon, Filter } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { MaintenanceStatusDialog } from './MaintenanceStatusDialog';
import { MapDialog } from './MapDialog';
import { defectApi } from "../api/defects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ImageWithFallback } from './fallback/ImageWithFallback';

export function MaintenancePage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [listViewDialogOpen, setListViewDialogOpen] = useState(false);
  const [listViewColumn, setListViewColumn] = useState<'assigned' | 'in_progress' | 'for_review'>('assigned');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogDefect, setImageDialogDefect] = useState<Defect | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDialogDefect, setMapDialogDefect] = useState<Defect | null>(null);

  // Inline filter states for Past Maintenance Activity table
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const all = await defectApi.getAll();
      setDefects(all);
    }
    load();
  }, []);

  const handleDefectClick = (defect: Defect) => {
    setSelectedDefect(defect);
    setStatusDialogOpen(true);
  };
  

  const handleImageClick = (defect: Defect | null) => {
    if (defect) {
      setImageDialogDefect(defect);
      setImageDialogOpen(true);
    }
  };

  const handleMapClick = (defect: Defect | null) => {
    if (defect) {
      setMapDialogDefect(defect);
      setMapDialogOpen(true);
    }
  };

  const handleUpdateStatus = async (
    defectId: string,
    newStatus: Defect["status"]
  ) => {
    try {
      
      const updated = await defectApi.updateStatus(Number(defectId), newStatus);

      
      setDefects(prev =>
        prev.map(d => (d.id === defectId ? updated : d))
      );

      setStatusDialogOpen(false);
    } catch (err) {
      console.error("Failed to update defect status:", err);
    }
  };

  const allCompletedActivities = defects
  .filter(d => d.status === "completed")
  .sort((a, b) => {
    const aTime = a.completedAt ? a.completedAt.getTime() : 0;
    const bTime = b.completedAt ? b.completedAt.getTime() : 0;
    return bTime - aTime;  // newest first
  });

  const uniqueTypes = useMemo(() => {
    const types = new Set(allCompletedActivities.map(d => d.type).filter(Boolean));
    return Array.from(types).sort();
  }, [allCompletedActivities]);

  const uniqueTeams = useMemo(() => {
    const teams = new Set(allCompletedActivities.map(d => d.assignedMaintenanceTeamName).filter(Boolean));
    return Array.from(teams).sort();
  }, [allCompletedActivities]);

  // Filtered completed activities
  const completedActivities = useMemo(() => {
    return allCompletedActivities.filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (teamFilter !== 'all' && d.assignedMaintenanceTeamName !== teamFilter) return false;
      return true;
    });
  }, [allCompletedActivities, typeFilter, teamFilter]);

  const avgDuration =
    completedActivities.length > 0
      ? (
          completedActivities.reduce((sum, d) => {
            if (d.startedAt && d.completedAt) {
              const ms = d.completedAt.getTime() - d.startedAt.getTime();
              return sum + ms / (1000 * 60 * 60); // convert to hours
            }
            return sum;
          }, 0) / completedActivities.length
        ).toFixed(1)
      : "0";


  const kanbanColumns = useMemo(() => ({
    assigned: defects.filter(m => m.status === 'assigned'),
    in_progress: defects.filter(m => m.status === 'in_progress'),
    for_review: defects.filter(m => m.status === 'for_review')
  }), [defects]);

  function calculateAge(date: Date | string): number {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }


  const handleShowList = (column: 'assigned' | 'in_progress' | 'for_review') => {
    setListViewColumn(column);
    setListViewDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#E6071F] text-white'; // Red
      case 'high': return 'bg-[#F2790D] text-white'; // Orange
      case 'normal': return 'bg-[#F9B504] text-gray-900'; // Yellow
      case 'low': return 'bg-[#7D6A55] text-white'; // Brown
      default: return 'bg-gray-500 text-white';
    }
  };

  const getColumnTitle = (column: 'assigned' | 'in_progress' | 'for_review') => {
    switch (column) {
      case 'assigned': return 'Assigned Tasks';
      case 'in_progress': return 'In Progress Tasks';
      case 'for_review': return 'Tasks for Review';
    }
  };

  const getColumnActivities = (column: 'assigned' | 'in_progress' | 'for_review') => {
    return kanbanColumns[column];
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1>Maintenance Workflow</h1>
        <p className="text-muted-foreground">
          Track and manage maintenance activities across all defects
        </p>
      </div>

      {/* Kanban Board */}
      <div>
        <h3 className="mb-4">Maintenance Kanban Board</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assigned Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#F9B504] text-gray-900">
              <div className="flex items-center justify-between">
                <h4>Assigned</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white">
                    {kanbanColumns.assigned.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20"
                    onClick={() => handleShowList('assigned')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                
                {kanbanColumns.assigned.map(defect => {
                  
                  return (
                    <Card 
                      key={defect.id} 
                      
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#F9B504]"
                      onClick={() => handleDefectClick(defect)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm">{defect.id}</span>
                          <Badge className={getPriorityColor(defect.priority ?? "normal")}>
                            {`${defect.severity} severity`}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground capitalize">{defect?.type}</p>
                          <p className="text-xs">{defect?.segment}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{defect.assignedMaintenanceTeamName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Assigned {defect.assignedAt?.toLocaleDateString() ?? "-"}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {kanbanColumns.assigned.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No assigned tasks</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* In Progress Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#F2790D] text-white">
              <div className="flex items-center justify-between">
                <h4>In Progress</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white text-gray-900">
                    {kanbanColumns.in_progress.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                    onClick={() => handleShowList('in_progress')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {kanbanColumns.in_progress.map(defect => {
                  const elapsedHours = defect.startedAt 
                    ? Math.floor((new Date().getTime() - defect.startedAt.getTime()) / (1000 * 60 * 60))
                    : 0;
                  
                  return (
                    <Card 
                      key={defect.id} 
                      
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#F2790D]"
                      onClick={() => handleDefectClick(defect)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm">{defect.id}</span>
                          <Badge className={getPriorityColor(defect.priority ?? "normal")}>
                            {`${defect.priority} maintenance priority`}
                            
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground capitalize">{defect?.type}</p>
                          <p className="text-xs">{defect?.segment}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{defect.assignedMaintenanceTeamName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{elapsedHours}h elapsed</span>
                        </div>
                        {defect.notes && (
                          <p className="text-xs text-muted-foreground italic">{defect.notes}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {kanbanColumns.in_progress.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No active repairs</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* For Review Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#7D6A55] text-white">
              <div className="flex items-center justify-between">
                <h4>For Review</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white text-gray-900">
                    {kanbanColumns.for_review.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                    onClick={() => handleShowList('for_review')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {kanbanColumns.for_review.map(defect => {
                  // const defect = getDefectOrSegmentData(defect.id);
                  const elapsedHours = defect.startedAt
                    ? Math.floor((Date.now() - defect.startedAt.getTime()) / (1000 * 60 * 60))
                    : 0;
                  
                  return (
                    <Card 
                      key={defect.id} 
                      
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#7D6A55]"
                      onClick={() => handleDefectClick(defect)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm">{defect.id}</span>
                          <Badge className={getPriorityColor(defect.priority ?? "normal")}>
                            {/* {defect.priority} */}
                            {`${defect.priority} maintenance priority`}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground capitalize">{defect?.type}</p>
                          <p className="text-xs">{defect?.segment}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{defect.assignedMaintenanceTeamName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{elapsedHours}h elapsed</span>
                        </div>
                        {defect.reviewedAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Ready {defect.reviewedAt.toLocaleDateString()}</span>
                          </div>
                        )}
                        {defect.notes && (
                          <p className="text-xs text-muted-foreground italic">{defect.notes}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {kanbanColumns.for_review.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No items awaiting review</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Past Maintenance List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b bg-[#FAFAF8]">
          <div className="flex items-center justify-between">
            <div>
              <h3>Past Maintenance Activities</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Completed repairs with performance metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Avg. Duration</p>
                <p className="font-medium">{avgDuration} hours</p>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F3F0] border-b">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Defect ID</th>
                <th className="text-left p-3 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    Type
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={`p-1 rounded hover:bg-gray-200 ${typeFilter !== 'all' ? 'text-[#7D6A55]' : 'text-muted-foreground'}`}>
                          <Filter className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="space-y-1">
                          <button
                            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${typeFilter === 'all' ? 'bg-gray-100 font-medium' : ''}`}
                            onClick={() => setTypeFilter('all')}
                          >
                            All Types
                          </button>
                          {uniqueTypes.map(type => (
                            <button
                              key={type}
                              className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 capitalize ${typeFilter === type ? 'bg-gray-100 font-medium' : ''}`}
                              onClick={() => setTypeFilter(type)}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
                <th className="text-left p-3 text-sm font-medium">Segment</th>
                <th className="text-left p-3 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    Team
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={`p-1 rounded hover:bg-gray-200 ${teamFilter !== 'all' ? 'text-[#7D6A55]' : 'text-muted-foreground'}`}>
                          <Filter className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="space-y-1">
                          <button
                            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${teamFilter === 'all' ? 'bg-gray-100 font-medium' : ''}`}
                            onClick={() => setTeamFilter('all')}
                          >
                            All Teams
                          </button>
                          {uniqueTeams.map(team => (
                            <button
                              key={team}
                              className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${teamFilter === team ? 'bg-gray-100 font-medium' : ''}`}
                              onClick={() => setTeamFilter(team ?? 'all')}
                            >
                              {team}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
                <th className="text-left p-3 text-sm font-medium">Assigned</th>
                <th className="text-left p-3 text-sm font-medium">Started</th>
                <th className="text-left p-3 text-sm font-medium">Completed</th>
                <th className="text-left p-3 text-sm font-medium">Duration</th>
                <th className="text-left p-3 text-sm font-medium">Time to Complete</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {completedActivities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <div className="text-center text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No completed maintenance activities yet</p>
                      <p className="text-xs mt-1">Completed repairs will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                completedActivities.map(defect => {
                 
                  const timeToComplete = defect.completedAt && defect.assignedAt
                    ? Math.floor((defect.completedAt.getTime() - defect.assignedAt.getTime()) / (1000 * 60 * 60))
                    : 0;
                  
                  return (
                    <tr key={defect.id} className="hover:bg-[#F5F3F0] transition-colors">
                      <td className="p-3 font-medium text-sm">{defect.id}</td>
                      <td className="p-3 text-sm capitalize">{defect?.type}</td>
                      <td className="p-3 text-sm">{defect?.segment}</td>
                      <td className="p-3 text-sm">{defect.assignedMaintenanceTeamName}</td>
                      <td className="p-3 text-sm">{defect.assignedAt?.toLocaleDateString() ?? "-"}</td>
                      <td className="p-3 text-sm">{defect.startedAt?.toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{defect.completedAt?.toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{defect.startedAt && defect.completedAt ? ((defect.completedAt.getTime() - defect.startedAt.getTime()) / (1000 * 60 * 60)).toFixed(1): "0"}h</td>
                      <td className="p-3 text-sm">{timeToComplete}h</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* List View Dialog */}
      <Dialog open={listViewDialogOpen} onOpenChange={setListViewDialogOpen}>
        <DialogContent className="!max-w-[95vw] w-full max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {listViewColumn === 'assigned' && <Users className="h-5 w-5 text-[#F9B504]" />}
              {listViewColumn === 'in_progress' && <Clock className="h-5 w-5 text-[#F2790D]" />}
              {listViewColumn === 'for_review' && <CheckCircle2 className="h-5 w-5 text-[#7D6A55]" />}
              {getColumnTitle(listViewColumn)}
            </DialogTitle>
            <DialogDescription>
              Detailed list view of all maintenance activities in this column
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div>
              <table className="w-full">
                <thead className="bg-[#F5F3F0] border-b sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Defect ID</th>
                    <th className="text-left p-3 text-sm font-medium">Type</th>
                    <th className="text-left p-3 text-sm font-medium">Severity</th>
                    <th className="text-left p-3 text-sm font-medium">Zone</th>
                    <th className="text-left p-3 text-sm font-medium">Segment</th>
                    <th className="text-left p-3 text-sm font-medium">Coordinates</th>
                    <th className="text-left p-3 text-sm font-medium">Map</th>
                    <th className="text-left p-3 text-sm font-medium">Detected</th>
                    <th className="text-left p-3 text-sm font-medium">Team</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                    <th className="text-left p-3 text-sm font-medium">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getColumnActivities(listViewColumn).map(defect => {
                    
                    
                    return (
                      <tr key={defect.id} className="hover:bg-[#F5F3F0] transition-colors">
                        <td className="p-3 font-medium text-sm">{defect.id}</td>
                        <td className="p-3 text-sm capitalize">{defect?.type || 'N/A'}</td>
                        <td className="p-3">
                          {defect ? (
                            <Badge variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {`${defect.severity} severity`}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">{defect?.zone || 'N/A'}</td>
                        <td className="p-3 text-sm">{defect?.segment || 'N/A'}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {defect ? `${defect.coordinates.lat.toFixed(4)}, ${defect.coordinates.lng.toFixed(4)}` : 'N/A'}
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={!defect}
                            onClick={() => handleMapClick(defect ?? null)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Show
                          </Button>
                        </td>
                        <td className="p-3 text-sm">
                          {defect.detectedAt
                            ? defect.detectedAt.toLocaleDateString()
                            : defect.assignedAt
                            ? defect.assignedAt.toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="p-3 text-sm">{defect.assignedMaintenanceTeamName}</td>
                        <td className="p-3">
                          <Badge className="bg-[#F2790D] text-white">
                            {defect.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setListViewDialogOpen(false);
                              handleDefectClick(defect);
                            }}
                          >
                            View
                          </Button>
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleImageClick(defect ?? null)}
                            className="h-8 w-8 p-0"
                            title="View defect image"
                            disabled={!defect || !defect.image}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <MaintenanceStatusDialog
        defect={selectedDefect}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Defect Image - {imageDialogDefect?.id}</DialogTitle>
            <DialogDescription>
              {imageDialogDefect?.type} defect | {imageDialogDefect?.severity} severity | {imageDialogDefect?.location}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-[#F5F3F0]">
              {imageDialogDefect?.image ? (
                <ImageWithFallback
                  src={imageDialogDefect.image}
                  alt={`Defect ${imageDialogDefect.id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-20" />
                    <p>No image available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{imageDialogDefect?.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Severity</p>
                <Badge variant={imageDialogDefect?.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {imageDialogDefect?.severity}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{imageDialogDefect?.zone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Segment</p>
                <p className="font-medium">{imageDialogDefect?.segment}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Detected</p>
                <p className="font-medium">{imageDialogDefect?.detectedAt.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Age</p>
                <p className="font-medium">{(imageDialogDefect?.ageInDays ??(imageDialogDefect?.detectedAt ? calculateAge(imageDialogDefect.detectedAt) : 0))} days</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <MapDialog
        defect={mapDialogDefect}
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
      />
    </div>
  );
}