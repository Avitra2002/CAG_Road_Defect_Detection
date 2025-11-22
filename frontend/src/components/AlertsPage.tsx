import { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { StatCard } from './StatCard';
import { DefectDetailsCard } from './DefectDetailsCard';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { SendToMaintenanceDialog } from './SendToMaintenanceDialog';
import { MapDialog } from './MapDialog';
import { Defect } from '../types';
import { AlertTriangle, TrendingUp, Clock, List, Calendar, MapPin, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { defectApi } from '../api/defects';

export function AlertsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [listViewDialogOpen, setListViewDialogOpen] = useState(false);
  const [listViewColumn, setListViewColumn] = useState<'new' | 'critical' | 'worsening'>('new');
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDialogDefect, setMapDialogDefect] = useState<Defect | null>(null);
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    async function load() {

      // Fetch raw defects from backend
      const all = await defectApi.getAll();

      // Compute ageInDays for each defect
      const processed = all.map(d => {
        const detected = new Date(d.detectedAt);
        const now = new Date();

        const diffMs = now.getTime() - detected.getTime();
        const ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return {
          ...d,
          ageInDays
        };
      });

      setDefects(processed);
    }

    load();
  }, []);


  const activeDefects = defects.filter(d =>
    d.status !== "completed" && d.status !== "false_positive"
  );

  // Kanban columns data
  const kanbanColumns = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return {
      new: activeDefects.filter(d => d.detectedAt >= threeDaysAgo),
      critical: activeDefects.filter(d => d.severity === 'critical'),
      worsening: activeDefects.filter(d => d.isWorsening)
    };
  }, [activeDefects]);

  const handleDefectClick = (defect: Defect) => {
    setSelectedDefect(defect);
  };

  const handleShowList = (column: 'new' | 'critical' | 'worsening') => {
    setListViewColumn(column);
    setListViewDialogOpen(true);
  };

  const handleChecked = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "checked");

    setDefects(prev =>
      prev.map(d => d.id === defectId ? updated : d)
    );

    toast.success(`Defect ${defectId} marked as checked`);
    setSelectedDefect(null);
  };

  const handleFalsePositive = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "false_positive");

    setDefects(prev =>
      prev.map(d => d.id === defectId ? updated : d)
    );

    toast.success(`Defect ${defectId} marked as false positive`);
    setSelectedDefect(null);
  };


  const handleEscalate = (defectId: string) => {
    setEscalateDialogOpen(true);
  };

  const handleEscalateSubmit = async (
    defectId: number,
    teamId: number,
    priority: string
  ) => {
    if (!selectedDefect) return;

    try {
      const updated = await defectApi.assignMaintenance(defectId, teamId, priority);

      setDefects(prev =>
        prev.map(d => (d.id === defectId.toString() ? updated : d))
      );

      toast.success(`Defect ${defectId} assigned to team ${teamId}`);

      setEscalateDialogOpen(false);
      setSelectedDefect(null);

    } catch (err) {
      console.error(err);
      toast.error("Failed to assign maintenance team");
    }
  };

  const handleChangeStatus = (defectId: string) => {
    setChangeStatusDialogOpen(true);
  };

  const handleStatusChange = async (newStatus: string) => {
  if (!selectedDefect) return;

    const updated = await defectApi.updateStatus(Number(selectedDefect.id), newStatus);

    setDefects(prev =>
      prev.map(d => (d.id === selectedDefect.id ? updated : d))
    );

    toast.success(`Defect ${selectedDefect.id} updated to ${newStatus}`);
    setChangeStatusDialogOpen(false);
    setSelectedDefect(null);
  };

  const handleDelete = async (defectId: string) => {
    await defectApi.delete(Number(defectId));
    setDefects(prev => prev.filter(d => d.id !== defectId));
    toast.success(`Defect ${defectId} deleted`);
    setSelectedDefect(null);
  };

  const handleStartRepair = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "in_progress");

    setDefects(prev =>
      prev.map(d => (d.id === defectId ? updated : d))
    );

    toast.success(`Repair started for defect ${defectId}`);
    setSelectedDefect(null);
  };

  const handleSubmitForReview = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "for_review");

    setDefects(prev =>
      prev.map(d => (d.id === defectId ? updated : d))
    );

    toast.success(`Defect ${defectId} submitted for review`);
    setSelectedDefect(null);
  };

  const handleReturnToProgress = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "in_progress");

    setDefects(prev =>
      prev.map(d => (d.id === defectId ? updated : d))
    );

    toast.success(`Defect ${defectId} returned to in progress`);
    setSelectedDefect(null);
  };

  const handleMarkCompleted = async (defectId: string) => {
    const updated = await defectApi.updateStatus(Number(defectId), "completed");

    setDefects(prev =>
      prev.map(d => (d.id === defectId ? updated : d))
    );

    toast.success(`Defect ${defectId} marked as completed`);
    setSelectedDefect(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-[#E6071F] text-white';
      case 'high': return 'bg-[#F2790D] text-white';
      case 'moderate': return 'bg-[#F9B504] text-gray-900';
      case 'low': return 'bg-[#7D6A55] text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for_checking': return 'bg-[#F9B504] text-gray-900'; // Yellow
      case 'checked': return 'bg-[#7D6A55] text-white'; // Brown
      case 'false_positive': return 'bg-gray-500 text-white'; // Gray
      case 'assigned': return 'bg-[#7D6A55] text-white'; // Brown (same as checked but has maintenance team)
      case 'in_progress': return 'bg-[#F2790D] text-white'; // Orange
      case 'for_review': return 'bg-[#F9B504] text-gray-900'; // Yellow
      case 'completed': return 'bg-green-600 text-white'; // Green
      default: return 'bg-gray-500 text-white';
    }
  };

  const getColumnTitle = (column: 'new' | 'critical' | 'worsening') => {
    switch (column) {
      case 'new': return 'New Entries (Last 3 Days)';
      case 'critical': return 'Critical Defects';
      case 'worsening': return 'Worsening Defects';
    }
  };

  const getColumnDefects = (column: 'new' | 'critical' | 'worsening') => {
    return kanbanColumns[column];
  };


  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'for_checking': 'For Checking',
      'checked': 'Checked',
      'false_positive': 'False +',
      'assigned': 'Assigned',
      'in_progress': 'In Progress',
      'for_review': 'For Review',
      'completed': 'Completed'
    };
    return labels[status] || status;
  };


  const DefectCard = ({ defect, onClick, columnColor }: { defect: Defect; onClick: () => void; columnColor: string }) => {
    const actualStatus = defect.status;

    return (
      <Card 
        
        className={`p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${columnColor}`}
        onClick={onClick}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <span className="font-medium text-sm">{defect.id}</span>
            <Badge className={getSeverityColor(defect.severity)}>
              {`${defect.severity} severity`}
            </Badge>
          </div>
          
          {defect.isWorsening && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              Worsening
            </Badge>
          )}

          <div className="text-sm space-y-1">
            <p className="text-muted-foreground capitalize">{defect.type} defect</p>
            <p className="text-xs">{defect.segment}</p>
            <p className="text-xs text-muted-foreground">{defect.zone}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Detected {defect.detectedAt.toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{defect.ageInDays}d old</span>
          </div>

          <Badge className={getStatusColor(actualStatus)}>
            {getStatusLabel(actualStatus)}
          </Badge>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">

      <div>
        <h1>Alerts & Prioritization</h1>
        <p className="text-muted-foreground">
          Monitor critical and worsening defects requiring immediate attention
        </p>
      </div>

      {/* Kanban Board */}
      <div>
        <h3 className="mb-4">Prioritization Kanban Board</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New Entries Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#F9B504] text-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <h4>New Entries</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white">
                    {kanbanColumns.new.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20"
                    onClick={() => handleShowList('new')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs mt-1 opacity-90">Last 3 days</p>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {/* NEW ENTRIES COLUMN: Border color is yellow #F9B504 */}
                {kanbanColumns.new.map(defect => (
                  <DefectCard 
                    key={defect.id} 
                    defect={defect}
                    onClick={() => handleDefectClick(defect)}
                    columnColor="border-l-[#F9B504]"
                  />
                ))}
                {kanbanColumns.new.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No new entries</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Critical Defects Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#E6071F] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <h4>Critical Defects</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white text-gray-900">
                    {kanbanColumns.critical.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                    onClick={() => handleShowList('critical')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs mt-1 opacity-90">Immediate attention</p>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {/* CRITICAL COLUMN: Border color is red #E6071F */}
                {kanbanColumns.critical.map(defect => (
                  <DefectCard 
                    key={defect.id} 
                    defect={defect}
                    onClick={() => handleDefectClick(defect)}
                    columnColor="border-l-[#E6071F]"
                  />
                ))}
                {kanbanColumns.critical.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No critical defects</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Worsening Defects Column */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#F2790D] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <h4>Worsening Defects</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white text-gray-900">
                    {kanbanColumns.worsening.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                    onClick={() => handleShowList('worsening')}
                    title="Display as list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs mt-1 opacity-90">Showing deterioration</p>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {/* WORSENING COLUMN: Border color is orange #F2790D */}
                {kanbanColumns.worsening.map(defect => (
                  <DefectCard 
                    key={defect.id} 
                    defect={defect}
                    onClick={() => handleDefectClick(defect)}
                    columnColor="border-l-[#F2790D]"
                  />
                ))}
                {kanbanColumns.worsening.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No worsening defects</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* List View Dialog */}
      <Dialog open={listViewDialogOpen} onOpenChange={setListViewDialogOpen}>
        <DialogContent className="!max-w-[95vw] w-full max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {listViewColumn === 'new' && <Clock className="h-5 w-5 text-[#F9B504]" />}
              {listViewColumn === 'critical' && <AlertTriangle className="h-5 w-5 text-[#E6071F]" />}
              {listViewColumn === 'worsening' && <TrendingUp className="h-5 w-5 text-[#F2790D]" />}
              {getColumnTitle(listViewColumn)}
            </DialogTitle>
            <DialogDescription>
              Detailed list view of all defects in this category
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
                    <th className="text-left p-3 text-sm font-medium">Detected</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {getColumnDefects(listViewColumn).map((defect) => {
                    const actualStatus = defect.status;

                    return (
                      <tr 
                        key={defect.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setListViewDialogOpen(false);
                          handleDefectClick(defect);
                        }}
                      >
                        <td className="p-3 font-medium">{defect.id}</td>
                        <td className="p-3 capitalize">{defect.type}</td>
                        <td className="p-3">
                          <Badge className={getSeverityColor(defect.severity)}>
                            {`${defect.severity} severity`}
                          </Badge>
                        </td>
                        <td className="p-3">{defect.zone}</td>
                        <td className="p-3">{defect.segment}</td>
                        <td className="p-3 text-xs font-mono">
                          {defect.coordinates.lat.toFixed(4)}, {defect.coordinates.lng.toFixed(4)}
                        </td>
                        <td className="p-3">{defect.detectedAt.toLocaleDateString()}</td>
                        <td className="p-3">
                          <Badge className={getStatusColor(actualStatus)}>
                            {getStatusLabel(actualStatus)}
                          </Badge>
                        </td>
                        <td className="p-3">{defect.ageInDays}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Defect Details Dialog */}
      <Dialog open={!!selectedDefect && !mapDialogOpen} onOpenChange={(open) => !open && setSelectedDefect(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">
            Defect Details - {selectedDefect?.id || 'Unknown'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedDefect ? `${selectedDefect.type} defect with ${selectedDefect.severity} severity` : 'Defect information'}
          </DialogDescription>
          {selectedDefect && (
            <div className="flex-1 overflow-y-auto">
              <DefectDetailsCard
                defect={selectedDefect}
                onClose={() => setSelectedDefect(null)}
                onChecked={handleChecked}
                onFalsePositive={handleFalsePositive}
                onEscalate={handleEscalate}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDelete}
                onStartRepair={handleStartRepair}
                onSubmitForReview={handleSubmitForReview}
                onReturnToProgress={handleReturnToProgress}
                onMarkCompleted={handleMarkCompleted}
                onShowInMap={() => {
                  setMapDialogDefect(selectedDefect);
                  setMapDialogOpen(true);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      {changeStatusDialogOpen && selectedDefect && (
        <ChangeStatusDialog
                  open={changeStatusDialogOpen}
                  onOpenChange={setChangeStatusDialogOpen}
                  currentStatus={selectedDefect?.status as any}
                  onStatusChange={(newStatus) => handleStatusChange(newStatus)}
                />
      )}

      {/* Escalate Dialog (Send to Maintenance) */}
      {escalateDialogOpen && selectedDefect && (
        <SendToMaintenanceDialog
          open={escalateDialogOpen}
          onOpenChange={setEscalateDialogOpen}
          defect={selectedDefect}
          onAssign={(defect_id, team, priority) => {
            handleEscalateSubmit(Number(defect_id), Number(team), priority);
          }}
        />
      )}

      {/* Map Dialog */}
      {mapDialogOpen && mapDialogDefect && (
        <MapDialog
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          defect={mapDialogDefect}
        />
      )}
    </div>
  );
}