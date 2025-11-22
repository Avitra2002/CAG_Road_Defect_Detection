import { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { DefectMap } from './DefectMap';
import { SendToMaintenanceDialog } from './SendToMaintenanceDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Defect, DefectPriority } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExternalLink, Filter, MapPin, TrendingUp, UserPlus, X, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
// import { ImageWithFallback } from './fallback/ImageWithFallback';
import { DefectDetailsCard } from './DefectDetailsCard';
import { defectApi} from "../api/defects"
import { segmentApi } from '../api/segments';

interface DefectsPageProps {
  focusedDefectId?: string | null;
  onDefectFocused?: () => void;
}

export function DefectsPage({ focusedDefectId, onDefectFocused }: DefectsPageProps) {
 
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [showResolvedDefects, setShowResolvedDefects] = useState<boolean>(false);
  
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [highlightedDefectId, setHighlightedDefectId] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [, forceUpdate] = useState({});
  const defectRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [allDefects, setAllDefects] = useState<Defect[]>([]);
  const [segments, setSegments] = useState([]);
  const [defectIdForStatusChange, setDefectIdForStatusChange] = useState<string | null>(null);


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
  
  useEffect(() => {
    async function load() {
      const [defects, segments] = await Promise.all([
        defectApi.getAll(),
        segmentApi.getAll(),
      ]);
      setAllDefects(defects);
      setSegments(segments);
    }
    load();
  }, []);
  

  useEffect(() => {
    if (focusedDefectId) {
      const defect = allDefects.find(d => d.id === focusedDefectId);
      if (defect) {
        setSelectedDefect(defect);
        setHighlightedDefectId(focusedDefectId);
        
        // Show notification
        toast.info(`Navigated to ${focusedDefectId} on map`, {
          duration: 3000,
          description: `${defect.type} • ${defect.severity} severity`
        });
        
        // Scroll to the map container first
        setTimeout(() => {
          if (mapContainerRef.current) {
            mapContainerRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedDefectId(null);
          onDefectFocused?.();
        }, 3000);
      }
    }
  }, [focusedDefectId, onDefectFocused]);

  const filteredDefects = useMemo(() => {
    return allDefects.filter(d => {
      const defectDate = d.detectedAt;
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      if (defectDate < start || defectDate > end) return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      
      // Filter out resolved defects unless the checkbox is checked
      if (!showResolvedDefects && (d.status === 'completed' || d.status === 'false_positive')) return false;
      
      if (assignmentFilter === 'assigned' && !d.assignedMaintenanceTeamId) return false;
      if (assignmentFilter === 'unassigned' && (d.assignedMaintenanceTeamId)) return false;

      return true;
    });
  }, [allDefects,startDate, endDate, typeFilter, severityFilter, statusFilter, assignmentFilter, showResolvedDefects]);

  // Filter out deleted defects from display
  const activeDefects = filteredDefects;

  const allDefectsForMap = filteredDefects;
  

  const getDefectAssignments = (defectId: string) => {
    const defect = allDefects.find(d => d.id === defectId);
    return {
      maintenanceTeam: defect?.assignedMaintenanceTeamId ?? null
    };
  };
  
  const defectsByType = useMemo(() => {
    const counts = { pothole: 0, crack: 0, marking: 0, roughness: 0 };
    activeDefects.forEach(d => counts[d.type]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeDefects]);

  const defectsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
    activeDefects.forEach(d => counts[d.severity]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeDefects]);

  // const trendData = getTrendData(30);
  // const defectsBySegment = getDefectsBySegment().slice(0, 10);
  // const defectsByZone = getDefectsByZone();

  const defectsBySegment = useMemo(() => {
    const map = {};
    allDefects.forEach(d => {
      if (!map[d.segment]) map[d.segment] = 0;
      map[d.segment]++;
    });
    return Object.entries(map).map(([segment, count]) => ({ segment, count }));
  }, [allDefects]);

  const defectsByZone = useMemo(() => {
    const map = {};
    allDefects.forEach(d => {
      if (!map[d.zone]) map[d.zone] = 0;
      map[d.zone]++;
    });
    return Object.entries(map).map(([zone, count]) => ({ zone, count }));
  }, [allDefects]);

  const trendData = useMemo(() => {
    // generate last 30 days based on detectedAt
    const map = {};
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      map[key] = { date: key, new: 0, resolved: 0 };
    }

    allDefects.forEach(d => {
      const detectedKey = d.detectedAt?.toISOString().slice(0, 10);
      if (map[detectedKey]) map[detectedKey].new++;

      if (d.completedAt) {
        const completedKey = d.completedAt.toISOString().slice(0, 10);
        if (map[completedKey]) map[completedKey].resolved++;
      }
    });

  return Object.values(map).reverse();
}, [allDefects]);

  const refresh = async () => {
    const defects = await defectApi.getAll();
    setAllDefects(defects);

    // If a defect is opened in the side panel, auto-refresh it
    if (selectedDefect) {
      const updated = defects.find(d => d.id === selectedDefect.id);
      if (updated) setSelectedDefect(updated);
    }
  };

  const handleAssignment = async (defectId: string, teamId: number, priority: DefectPriority, notes?: string) => {
    await defectApi.assignMaintenance(Number(defectId), teamId, priority);
    toast.success(`Assigned to maintenance`);
    refresh();
  };

  const handleStatusChange = async (defectId: string, newStatus: 'for_checking' | 'checked' | 'false_positive') => {
    await defectApi.updateStatus(Number(defectId), newStatus);
    toast.success(`Status updated to ${newStatus}`);
    await refresh();
  };

  const handleEscalate = () => {
    if (!selectedDefect) return;
    setMaintenanceDialogOpen(true);
  };

  const handleMaintenanceAssignment = async (defectId: string, teamId: number, priority: DefectPriority, notes?: string) => {
    await defectApi.assignMaintenance(Number(defectId), teamId, priority);
    toast.success(`Defect ${defectId} escalated to maintenance (${priority})`);
    setMaintenanceDialogOpen(false);
    await refresh();
  };

  const handleDelete = async (defectId) => {
    await defectApi.delete(Number(defectId));
    toast.success("Defect deleted");
    setSelectedDefect(null);
    await refresh();
  };

  const handleChangeStatus = (defectId: string) => {
    setDefectIdForStatusChange(defectId);
    setChangeStatusDialogOpen(true);
  };

  const handleChecked = (defectId: string) => {
    handleStatusChange(defectId, 'checked');
  };

  const handleFalsePositive = (defectId: string) => {
    handleStatusChange(defectId, 'false_positive');
  };

  const handleEscalateAction = (defectId: string) => {
    handleEscalate();
  };

  const handleStartRepair = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'in_progress');
    toast.success(`Repair started for ${defectId}`);
    await refresh();
    
  };

  const handleSubmitForReview = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'for_review');
    toast.success(`${defectId} submitted for review`);
    await refresh();
  };

  const handleReturnToProgress = async (defectId: string) => {
    
    await defectApi.updateStatus(Number(defectId), 'in_progress');
    toast.success(`${defectId} returned to in progress`);
    await refresh();
  };

  const handleMarkCompleted = async (defectId: string) => {
    defectApi.updateStatus(Number(defectId), 'completed');
    toast.success(`${defectId} marked as completed`);
    setSelectedDefect(null);
    await refresh();
    
  };


  const COLORS = {
    critical: '#E6071F',
    high: '#F2790D',
    moderate: '#F9B504',
    low: '#7D6A55',
    pothole: '#E6071F',
    crack: '#F2790D',
    marking: '#F9B504',
    roughness: '#7D6A55'
  };

  return (
    <div className="space-y-6 p-6">
     
      <div className="flex items-start justify-between">
        <div>
          <h1>Defect Management</h1>
          <p className="text-muted-foreground">
            Comprehensive defect tracking and analysis
          </p>
        </div>
        <Button className="bg-[#7D6A55] hover:bg-[#705E4E] gap-2">
          <ExternalLink className="h-4 w-4" />
          View 3D BIM Model
        </Button>
      </div>

      {/* Active Defects by Type */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {defectsByType.map(item => (
          <Card key={item.name} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground capitalize">{item.name}</p>
                <p className="text-2xl font-medium mt-1">{item.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-[${COLORS[item.name as keyof typeof COLORS]}]/10 flex items-center justify-center`}>
                <MapPin className="h-6 w-6" style={{ color: COLORS[item.name as keyof typeof COLORS] }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stats and Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats - Left (2 columns) */}
        <div className="lg:col-span-2 grid grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Defects</p>
              <p
                style={{ fontSize: "2rem", lineHeight: 1 }}
                className="font-semibold text-[#7D6A55]">
              {activeDefects.length}
            </p>
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E6071F]" />
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              {/* <p className="text-4xl font-semibold text-[#E6071F]">
                {activeDefects.filter(d => d.severity === 'critical').length}
              </p> */}
              <p
                style={{ fontSize: "2rem", lineHeight: 1 }}
                className="font-semibold text-[#E6071F]">
              {activeDefects.filter(d => d.severity === 'critical').length}
            </p>
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F2790D]" />
                <p className="text-sm text-muted-foreground">High</p>
              </div>
              {/* <p className="text-4xl font-semibold text-[#F2790D]">
                {activeDefects.filter(d => d.severity === 'high').length}
              </p> */}
              <p
                style={{ fontSize: "2rem", lineHeight: 1 }}
                className="font-semibold text-[#F2790D]">
              {activeDefects.filter(d => d.severity === 'high').length}
            </p>
            </div>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Unassigned</p>
              {/* <p className="text-4xl font-semibold text-gray-600">
                {activeDefects.filter(d => !d.assignedMaintenanceTeamId).length}
              </p> */}
              <p
                style={{ fontSize: "2rem", lineHeight: 1 }}
                className="font-semibold text-gray-600">
              {activeDefects.filter(d => !d.assignedMaintenanceTeamId).length}
            </p>
            </div>
          </Card>
        </div>

        {/* Search & Filter - Right (1 column) */}
        <Card className="p-4 bg-[#FAFAF8]">
          <div className="grid grid-cols-2 gap-2 h-full content-between">
            {/* Defect Type */}
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7">
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

            {/* Severity */}
            <div className="space-y-1">
              <Label className="text-xs">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-7">
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

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="for_checking">For Checking</SelectItem>
                  <SelectItem value="checked">Checked</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="for_review">For Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                className="h-7 text-xs"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            {/* View Past Resolved Defects Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-resolved"
                checked={showResolvedDefects}
                onCheckedChange={(checked) => setShowResolvedDefects(checked as boolean)}
              />
              <Label
                htmlFor="show-resolved"
                className="text-xs cursor-pointer"
              >
                Show resolved
              </Label>
            </div>
          </div>
        </Card>
      </div>

      {/* Map and Defect List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section - Left/Center */}
        <div ref={mapContainerRef} className="lg:col-span-2">
          {/* 2D Map */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b bg-[#FAFAF8]">
              <h3>Defect Distribution Map</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click on markers for details
              </p>
            </div>
            <div className="h-[600px]">
              <DefectMap
                defects={allDefectsForMap}
                segments={segments}
                focusedDefectId={focusedDefectId}
                hideOverlay={true}
                externalSelectedDefect={selectedDefect}
                onDefectClick={(defect) => {
                  // Show defect details in the right panel
                  setSelectedDefect(defect);
                }}
              />
            </div>
          </Card>
        </div>

        {/* Right Panel: Defect Details OR Defect List */}
        {selectedDefect ? (
          <div style={{ height: 'calc(600px + 73px)' }}>
            <DefectDetailsCard
              defect={selectedDefect}
              onClose={() => setSelectedDefect(null)}
              onChecked={handleChecked}
              onFalsePositive={handleFalsePositive}
              onEscalate={handleEscalateAction}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
              onStartRepair={handleStartRepair}
              onSubmitForReview={handleSubmitForReview}
              onReturnToProgress={handleReturnToProgress}
              onMarkCompleted={handleMarkCompleted}
            />
          </div>
        ) : (
          <Card className="p-0 overflow-hidden flex flex-col" style={{ height: 'calc(600px + 73px)' }}>
            <div className="p-4 border-b bg-[#FAFAF8]">
              <h3>Defect List</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeDefects.length} active defect{activeDefects.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Defect List */}
            <div className="divide-y flex-1 overflow-y-auto">
              {activeDefects.slice(0, 50).map(defect => {
                const assignments = getDefectAssignments(defect.id);
                const maintenanceTeam = assignments.maintenanceTeam || defect.assignedMaintenanceTeamId;

                return (
                  <div
                    key={defect.id}
                    ref={el => {defectRefs.current[defect.id] = el;}}
                    className={`p-3 hover:bg-[#F5F3F0] transition-all cursor-pointer ${
                      highlightedDefectId === defect.id
                        ? 'bg-[#F9B504]/20 border-l-4 border-l-[#F9B504]'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedDefect(defect);
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{defect.id}</span>
                            <Badge
                              variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}
                               className={`text-xs text-white bg-[${COLORS[defect.severity]}]`}
                            >
                              {`${defect.severity} severity`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">{defect.type}</p>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Zone:</span>
                          <span className="text-sm">{defect.zone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Segment:</span>
                          <span className="text-sm truncate">{defect.segment}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Status:</span>

                          <Badge className={`text-xs capitalize ${getStatusColor(defect.status)}`}>
                            {defect.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Distribution by Type */}
        <Card className="p-6">
          <h3 className="mb-4">Defect Distribution by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={defectsByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {defectsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Defect Distribution by Severity */}
        <Card className="p-6">
          <h3 className="mb-4">Defect Distribution by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={defectsBySeverity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis dataKey="name" stroke="#7D6A55" />
              <YAxis stroke="#7D6A55" />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {defectsBySeverity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Defect Trends */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#7D6A55]" />
            <h3>Defect Trends (30 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis dataKey="date" stroke="#7D6A55" fontSize={12} />
              <YAxis stroke="#7D6A55" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new" stroke="#E6071F" name="New Defects" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#7D6A55" name="Resolved" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Defects by Segment */}
        <Card className="p-6">
          <h3 className="mb-4">Top 10 Affected Segments</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={defectsBySegment} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
              <XAxis type="number" stroke="#7D6A55" />
              <YAxis dataKey="segment" type="category" width={120} stroke="#7D6A55" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#7D6A55" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Defects by Zone */}
      <Card className="p-6">
        <h3 className="mb-4">Defects by Zone</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={defectsByZone}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
            <XAxis dataKey="zone" stroke="#7D6A55" />
            <YAxis stroke="#7D6A55" />
            <Tooltip />
            <Bar dataKey="count" fill="#F2790D" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Assignment Dialog */}
      <SendToMaintenanceDialog
        defect={selectedDefect}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleAssignment}
      />

      {/* Maintenance Dialog */}
      <SendToMaintenanceDialog
        defect={selectedDefect}
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        onAssign={handleMaintenanceAssignment}
      />

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        open={changeStatusDialogOpen}
        onOpenChange={(open) => {
          setChangeStatusDialogOpen(open);
          if (!open) setDefectIdForStatusChange(null);
        }}
        currentStatus={selectedDefect?.status || 'for_checking'}
        onStatusChange={(newStatus) => {
          if (!defectIdForStatusChange) return;
          handleStatusChange(defectIdForStatusChange, newStatus);
        }}
      />
    </div>
  );
}