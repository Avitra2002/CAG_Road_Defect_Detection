import { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Defect, DefectPriority } from '../types';
import { Users, CheckCircle2, XCircle, ArrowRight, Trash2, MapPin, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SendToMaintenanceDialog } from './SendToMaintenanceDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { MapDialog } from './MapDialog';
import { defectApi } from '../api/defects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { ImageWithFallback } from './fallback/ImageWithFallback';


interface OpsAssignmentPageProps {
  onShowInMap?: (defectId: string) => void;
}

export function OpsAssignmentPage({ onShowInMap }: OpsAssignmentPageProps) {
  const [defects, setDefects] = useState<Defect[]>([]);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');


  useEffect(() => {
    async function load() {
      const data = await defectApi.getAll();
      setDefects(data);
    }
    load();
  }, []);

  const [animatingRows, setAnimatingRows] = useState<Record<string, { type: 'escalated'|'deleted', until: number }>>({});
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogDefect, setImageDialogDefect] = useState<Defect | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDialogDefect, setMapDialogDefect] = useState<Defect | null>(null);

  // Get unique zones for filter dropdown
  const uniqueZones = useMemo(() => {
    const zones = new Set(defects.map(d => d.zone));
    return Array.from(zones).sort();
  }, [defects]);

  const refresh = async () => {
    const data = await defectApi.getAll();
    setDefects(data);
  };


  const triggerRowAnimation = (defectId: string, type: 'escalated' | 'deleted') => {
    const until = Date.now() + 3000; // 3s display

    setAnimatingRows(prev => ({
      ...prev,
      [defectId]: { type, until }
    }));

    setTimeout(() => {
      setAnimatingRows(prev => {
        const updated = { ...prev };
        delete updated[defectId];
        return updated;
      });
    }, 3000);
  };


  const updateDefectStatus = async (defectId: string, newStatus: Defect['status']) => {
    await defectApi.updateStatus(Number(defectId), newStatus);
    toast.success(`Status updated to ${newStatus}`);
    refresh();
  };


  const handleEscalate = (defect: Defect) => {
    setSelectedDefect(defect);
    setMaintenanceDialogOpen(true);
  };


  const handleMaintenanceAssignment = async (defectId: string, teamId: number, priority: DefectPriority) => {
    await defectApi.assignMaintenance(Number(defectId), teamId, priority);
    toast.success(`Escalated to maintenance`);
    triggerRowAnimation(defectId, "escalated");
    setMaintenanceDialogOpen(false);
    setTimeout(() => {
      refresh();
    }, 3200);
  };


  const handleDelete = async (defectId: string) => {
    await defectApi.delete(Number(defectId));
    toast.success("Defect deleted");
    refresh();
  };

  const handleOpenStatusDialog = (defect: Defect) => {
    setSelectedDefect(defect);
    setChangeStatusDialogOpen(true);
  };


  const handleStatusChangeFromDialog = async (newStatus: Defect['status']) => {
    if (!selectedDefect) return;
    await updateDefectStatus(selectedDefect.id, newStatus);
    setChangeStatusDialogOpen(false);
  };


  const handleImageClick = (defect: Defect) => {
    setImageDialogDefect(defect);
    setImageDialogOpen(true);
  };

  const handleMapClick = (defect: Defect) => {
    setMapDialogDefect(defect);
    setMapDialogOpen(true);
  };

  function calculateAge(date: Date | string): number {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const getStatusColor = (status: Defect['status']) => {
    switch (status) {
      case 'for_checking': return 'bg-[#F9B504] text-gray-900';
      case 'checked': return 'bg-[#7D6A55] text-white';
      case 'false_positive': return 'bg-gray-500 text-white';
      case 'assigned': return 'bg-blue-600 text-white';
      case 'in_progress': return 'bg-orange-500 text-white';
      case 'for_review': return 'bg-purple-600 text-white';
      case 'completed': return 'bg-green-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };


  // Filter ops defects
  const opsDefects = useMemo(() => {
    return defects.filter(d => {
      // First filter to only ops statuses
      if (!['for_checking', 'checked', 'false_positive'].includes(d.status)) return false;

      // Apply filters
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
      if (zoneFilter !== 'all' && d.zone !== zoneFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Date filters
      if (startDate) {
        const start = new Date(startDate);
        if (d.detectedAt < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        if (d.detectedAt > end) return false;
      }

      return true;
    });
  }, [defects, typeFilter, severityFilter, zoneFilter, statusFilter, startDate, endDate]);


  const statusCounts = {
    for_checking: defects.filter(a => a.status === 'for_checking').length,
    checked: defects.filter(a => a.status === 'checked').length,
    false_positive: defects.filter(a => a.status === 'false_positive').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1>Ops Team Assignments</h1>
        <p className="text-muted-foreground">
          Review and manage defects assigned to operations teams
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#F9B504]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">For Checking</p>
              <p className="text-2xl font-medium mt-1">{statusCounts.for_checking}</p>
            </div>
            <Users className="h-8 w-8 text-[#F9B504]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#7D6A55]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Checked</p>
              <p className="text-2xl font-medium mt-1">{statusCounts.checked}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-[#7D6A55]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">False Positives</p>
              <p className="text-2xl font-medium mt-1">{statusCounts.false_positive}</p>
            </div>
            <XCircle className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-[#FAFAF8]">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pothole">Pothole</SelectItem>
                <SelectItem value="crack">Crack</SelectItem>
                <SelectItem value="marking">Marking</SelectItem>
                <SelectItem value="roughness">Roughness</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity Filter */}
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zone Filter */}
          <div className="space-y-1">
            <Label className="text-xs">Zone</Label>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {uniqueZones.map(zone => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="for_checking">For Checking</SelectItem>
                <SelectItem value="checked">Checked</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Assignments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b bg-[#FAFAF8]">
          <div className="flex items-center gap-2">
            <h3>Ops Team Assignments</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm p-4">
                  <p className="font-medium mb-2">Workflow Notes</p>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                      <span><strong>Checked:</strong> Defect verified and valid. Can be escalated to maintenance or marked as false positive</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-[#F2790D] flex-shrink-0" />
                      <span><strong>Escalate:</strong> Send directly to maintenance team for repair</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 mt-0.5 text-gray-500 flex-shrink-0" />
                      <span><strong>False Positive:</strong> Defect incorrectly detected. Can be deleted or re-checked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Trash2 className="h-3 w-3 mt-0.5 text-red-500 flex-shrink-0" />
                      <span><strong>Delete:</strong> Permanently remove false positive entries</span>
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {opsDefects.length} defect{opsDefects.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F3F0] border-b">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Defect ID</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-sm font-medium">Severity</th>
                <th className="text-left p-3 text-sm font-medium">Zone</th>
                <th className="text-left p-3 text-sm font-medium">Segment</th>
                <th className="text-left p-3 text-sm font-medium">Coordinates</th>
                <th className="text-left p-3 text-sm font-medium">Map</th>
                <th className="text-left p-3 text-sm font-medium">Detected</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
                <th className="text-left p-3 text-sm font-medium">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {opsDefects.map(defect => {
                const anim = animatingRows[defect.id];
                const isDeleting = !!anim;

                return (
                  <tr
                    key={defect.id}
                    className={`hover:bg-[#F5F3F0] transition-colors ${
                      isDeleting ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-3 font-medium text-sm">{defect.id}</td>
                    <td className="p-3 text-sm capitalize">{defect.type}</td>
                    <td className="p-3">
                      <Badge variant={defect.severity === "critical" ? "destructive" : "secondary"}>
                        {defect.severity}
                      </Badge>
                    </td>

                    <td className="p-3 text-sm">{defect.zone}</td>
                    <td className="p-3 text-sm">{defect.segment}</td>

                    <td className="p-3 text-xs text-muted-foreground">
                      {defect.coordinates.lat.toFixed(4)}, {defect.coordinates.lng.toFixed(4)}
                    </td>

                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMapClick(defect)}
                        className="text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Show
                      </Button>
                    </td>

                    <td className="p-3 text-sm">
                      {new Date(defect.detectedAt).toLocaleDateString()}
                    </td>

                    <td className="p-3">
                      {isDeleting ? (
                        <span
                          className={`text-sm font-medium whitespace-nowrap ${
                            anim?.type === "deleted"
                              ? "text-muted-foreground"
                              : "text-[#F2790D]"
                          }`}
                        >
                          {anim?.type === "deleted" ? "Entry deleted" : "→ Sent to Maintenance"}
                        </span>
                      ) : (
                        <Badge className={getStatusColor(defect.status)}>
                          {defect.status.replace("_", " ")}
                        </Badge>
                      )}
                    </td>

                    <td className="p-3">
                      {!isDeleting && (
                        <div className="flex gap-2">
                          {defect.status === "for_checking" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateDefectStatus(defect.id, "checked")}
                                className="text-xs"
                              >
                                Checked
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateDefectStatus(defect.id, "false_positive")}
                                className="text-xs"
                              >
                                False+
                              </Button>
                            </>
                          )}

                          {defect.status === "checked" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleEscalate(defect)}
                                className="bg-[#F2790D] hover:bg-[#E06808] text-xs"
                              >
                                Escalate
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusDialog(defect)}
                                className="text-xs"
                              >
                                Change Status
                              </Button>
                            </>
                          )}

                          {defect.status === "false_positive" && (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(defect.id)}
                                className="text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusDialog(defect)}
                                className="text-xs"
                              >
                                Change Status
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleImageClick(defect)}
                        className="h-8 w-8 p-0"
                        title="View defect image"
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
      </Card>

      {/* Send to Maintenance Dialog */}
      <SendToMaintenanceDialog
        defect={selectedDefect}
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        onAssign={handleMaintenanceAssignment}
      />

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        open={changeStatusDialogOpen}
        onOpenChange={setChangeStatusDialogOpen}
        currentStatus={selectedDefect?.status || 'for_checking'}
        onStatusChange={handleStatusChangeFromDialog}
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
              {imageDialogDefect?.images && imageDialogDefect.images.length > 0 ? (
                <ImageWithFallback
                  src={imageDialogDefect.images[0].url}
                  alt={`Defect ${imageDialogDefect.id}`}
                  className="w-full h-full object-cover"
                />
              ) : imageDialogDefect?.image ? (
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