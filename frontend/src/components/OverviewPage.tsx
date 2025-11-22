import { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { StatCard } from './StatCard';
import { DefectMap } from './DefectMap';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Defect, DefectSeverity, RoadSegment, DefectPriority } from '../types';
import { AlertTriangle, Wrench, Activity, TrendingUp, MapPin, UserPlus, Image as ImageIcon, Filter, Search, X, Calendar, Ruler, Box, Map as MapIcon, Clock, CheckCircle2, Users, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from './fallback/ImageWithFallback';
import { DefectDetailsCard } from './DefectDetailsCard';
import { SegmentDetailsCard } from './SegmentDetailsCard';
import { defectApi } from "../api/defects";
import { segmentApi } from '../api/segments';
import { SendToMaintenanceDialog } from './SendToMaintenanceDialog';

type ListItemType = 
  | { type: 'defect'; data: Defect }
  | { type: 'segment'; data: RoadSegment };

export function OverviewPage() {
  
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [currentDefectForStatusChange, setCurrentDefectForStatusChange] = useState<Defect | null>(null);
  const [severityFilter, setSeverityFilter] = useState<DefectSeverity | 'all'>('critical');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<Defect['type'] | 'all'>('all');
  const [is3DView, setIs3DView] = useState(false);
  const [, forceUpdate] = useState({});

  const [showDefects, setShowDefects] = useState(true);
  const [showRoughness, setShowRoughness] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [iriFilter, setIriFilter] = useState<'all' | DefectSeverity>('all');
  
  // Refs for scrolling
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
  
  const refreshAll = async () => {
    const [urgent, active, all, unassigned] = await Promise.all([
      defectApi.getUrgent(),
      defectApi.getActive(),
      defectApi.getAll(),
      defectApi.getUnassigned()
    ]);

    setUrgentDefects(urgent);
    setActiveDefects(active);
    setAllUnassigned(unassigned);

    const statusCount = { ...initialStatus };
    all.forEach(d => statusCount[d.status]++);
    setDefectStatus(statusCount);
  };


  // Keyboard shortcut to close defect/segment details (Escape key)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDefect) setSelectedDefect(null);
        if (selectedSegment) setSelectedSegment(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedDefect, selectedSegment]);

  const [urgentDefects, setUrgentDefects] = useState<Defect[]>([]);
  useEffect(() => {
    defectApi.getUrgent().then(setUrgentDefects);
  }, []);
  const [maintenanceInProgress, setMaintenanceInProgress] = useState(0);

    useEffect(() => {
      defectApi.getActive().then(defects => {
        setMaintenanceInProgress(defects.filter(d => d.status === 'in_progress').length);
      });
    }, []);

  const [activeDefects, setActiveDefects] = useState<Defect[]>([]);
  useEffect(() => {
    defectApi.getActive().then(setActiveDefects);
  }, []);

  
  const iriThreshold = 4.0;
  const [avgIRI, setAvgIRI] = useState(0);
  const [criticalSegments, setCriticalSegments] = useState<RoadSegment[]>([]);

  useEffect(() => {
    segmentApi.getAverageIRI().then(data => {
      setAvgIRI(Number(data.average));
    });
    
    segmentApi.getCritical().then(setCriticalSegments);
  }, []);

  const initialStatus = {
    for_checking: 0,
    checked: 0,
    false_positive: 0,
    assigned: 0,
    in_progress: 0,
    for_review: 0,
    completed: 0,
  };

  const [defectStatus, setDefectStatus] = useState(initialStatus);

    useEffect(() => {
      defectApi.getAll().then(defects => {
        const statusCount = { ...initialStatus };

        defects.forEach(d => {
          if (statusCount[d.status] !== undefined) {
            statusCount[d.status]++;
          }
        });

        setDefectStatus(statusCount);
      });
  }, []);

  const [allSegmentsRaw, setAllSegmentsRaw] = useState<RoadSegment[]>([]);

    useEffect(() => {
      segmentApi.getAll().then(setAllSegmentsRaw);
  }, []);
  
  
  const allSegments = useMemo(() => {
    if (allSegmentsRaw.length === 0) return [];

   
    let baseSegments = allSegmentsRaw;

   
    if (!showRoughness && !showCoverage) {
      baseSegments = criticalSegments.length > 0 ? criticalSegments : allSegmentsRaw;
    }

    
    if (showRoughness && iriFilter !== 'all') {
      const iriRanges = {
        critical: [5.0, Infinity],
        high: [3.5, 5.0],
        moderate: [2.5, 3.5],
        low: [0, 2.5]
      };

      const [min, max] = iriRanges[iriFilter];
      return baseSegments.filter(s => s.iri >= min && s.iri < max);
    }

    return baseSegments;
  }, [showRoughness, showCoverage, criticalSegments, allSegmentsRaw, iriFilter]);
  
  
  const [allUnassigned, setAllUnassigned] = useState<Defect[]>([]);
  
  useEffect(() => {
    (async () => {
      const defects = await defectApi.getUnassigned(); // returns Promise
      setAllUnassigned(defects);
    })();
  }, []);


const filteredDefects = useMemo(() => {
  let filtered = [...allUnassigned]; // start with real array

  // Apply severity filter
  if (severityFilter !== 'all') {
    filtered = filtered.filter(d => d.severity === severityFilter);
  }

  // Apply type filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter(d => d.type === typeFilter);
  }

  // Apply search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      d.id.toLowerCase().includes(query) ||
      d.location.toLowerCase().includes(query) ||
      d.segment.toLowerCase().includes(query) ||
      d.type.toLowerCase().includes(query)
    );
  }

  return filtered;
}, [allUnassigned, severityFilter, typeFilter, searchQuery]);


  
  const listItems = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];
    
    
    if (showDefects) {
      filteredDefects.forEach(defect => {
        items.push({ type: 'defect', data: defect });
      });
    }
    
   
    if (showRoughness || showCoverage) {
      allSegments.forEach(segment => {
        items.push({ type: 'segment', data: segment });
      });
    }
    
    return items;
  }, [showDefects, showRoughness, showCoverage, filteredDefects, allSegments]);


  const handleDefectClick = (defect: Defect) => {
    setSelectedDefect(defect);
    setSelectedSegment(null);
    
    // Scroll to defect in list
    scrollToListItem(`defect-${defect.id}`);
  };

  const handleSegmentClick = (segment: RoadSegment) => {
    setSelectedSegment(segment);
    setSelectedDefect(null);
    
    // Scroll to segment in list
    scrollToListItem(`segment-${segment.id}`);
  };

  const handleListItemClick = (item: ListItemType) => {
    if (item.type === 'defect') {
      setSelectedDefect(item.data);
      setSelectedSegment(null);
      // Center map on defect
      setMapCenter({ ...item.data.coordinates });
    } else {
      setSelectedSegment(item.data);
      setSelectedDefect(null);
      // Center map on segment (use first coordinate)
      if (item.data.coordinates && item.data.coordinates.length > 0) {
        setMapCenter(item.data.coordinates[0]);
      }
    }
  };

  const scrollToListItem = (itemId: string) => {
    const element = listItemRefs.current.get(itemId);
    if (element && listContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAssignment = async (
    defectId: string,
    teamId: number,
    priority: DefectPriority,
    notes?: string
  ) => {
    try {
      await defectApi.assignMaintenance(Number(defectId), teamId, priority);
      toast.success(`Defect ${defectId} assigned to maintenance team`);

      await refreshAll();
      setSelectedDefect(null);
      setAssignDialogOpen(false);
    } catch (err) {
      toast.error("Failed to assign defect");
    }
  };

    const handleChecked = async (defectId: string) => {
      await defectApi.updateStatus(Number(defectId), 'checked');
      const updated = await defectApi.getById(Number(defectId));
      setSelectedDefect(updated);
      toast.success(`Defect ${defectId} marked as checked`);
      await refreshAll();
    };

  const handleFalsePositive = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'false_positive');
    setSelectedDefect(await defectApi.getById(Number(defectId)))
    toast.success(`Marked as false positive`);
    await refreshAll();
  };

  const handleEscalate = (defectId: string) => {
    // When escalating, we want to assign to maintenance team
    setAssignDialogOpen(true);
  };

  const handleChangeStatus = (defectId: string) => {
    const defect = filteredDefects.find(d => d.id === defectId);
    if (defect) {
      setCurrentDefectForStatusChange(defect);
      setChangeStatusDialogOpen(true);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentDefectForStatusChange) return;
    const defectId = Number(currentDefectForStatusChange.id);

     await defectApi.updateStatus(defectId, newStatus);
     const updated = await defectApi.getById(defectId);
     setSelectedDefect(prev =>
      prev && prev.id === currentDefectForStatusChange.id ? updated : prev
    );
  
    
    await refreshAll();
    toast.success(`Status updated to ${newStatus}`);
    setChangeStatusDialogOpen(false);
    setCurrentDefectForStatusChange(null);
  };

  const handleDelete = async (defectId: string) => {
    try {
      await defectApi.delete(Number(defectId));
      toast.success(`Defect ${defectId} deleted`);

      await refreshAll();       // reload defect list + stats
      setSelectedDefect(null);  // close side panel
    } catch (err) {
      toast.error("Failed to delete defect");
    }
  };

  const handleStartRepair = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'in_progress');
    setSelectedDefect(await defectApi.getById(Number(defectId)))
    toast.success(`Repair started for ${defectId}`);
    await refreshAll();
  };

  const handleSubmitForReview = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'for_review');
    setSelectedDefect(await defectApi.getById(Number(defectId)));
    toast.success(`${defectId} submitted for review`);
    await refreshAll();
  };

  const handleReturnToProgress = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'in_progress');
    setSelectedDefect(await defectApi.getById(Number(defectId)));
    toast.success(`${defectId} returned to in_progress`);
    await refreshAll();
  };

  const handleMarkCompleted = async (defectId: string) => {
    await defectApi.updateStatus(Number(defectId), 'completed');
    setSelectedDefect(await defectApi.getById(Number(defectId)));
    toast.success(`${defectId} marked completed`);
    await refreshAll();
    setSelectedDefect(null);
  };

  useEffect(() => {
    console.log("👉 OverviewPage Segments Debug");
    console.log("showRoughness:", showRoughness);
    console.log("showCoverage:", showCoverage);
    console.log("criticalSegments:", criticalSegments.length);
    console.log("allSegmentsRaw:", allSegmentsRaw.length);
    console.log("allSegments (final):", allSegments.length);
  }, [showRoughness, showCoverage, criticalSegments, allSegmentsRaw, allSegments]);


  return (
    <div className="space-y-6 p-6">
      <div>
        <h1>Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of road safety across airside operations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Urgent Defects"
          value={urgentDefects.length}
          icon={AlertTriangle}
          trend={`${allUnassigned.length} unassigned`}
          className="border-l-4 border-l-[#E6071F]"
        />
        <StatCard
          title="Maintenance in Progress"
          value={maintenanceInProgress}
          icon={Wrench}
          trend="Active repairs"
          className="border-l-4 border-l-[#F2790D]"
        />
        <StatCard
          title="Total Active Defects"
          value={activeDefects.length}
          icon={Activity}
          trend="Across 75km network"
          className="border-l-4 border-l-[#7D6A55]"
        />
        <StatCard
          title="Average IRI"
          value={avgIRI}
          icon={TrendingUp}
          trend={avgIRI < iriThreshold ? 'Below threshold' : 'Above threshold'}
          className={`border-l-4 ${avgIRI < iriThreshold ? 'border-l-[#7D6A55]' : 'border-l-[#E6071F]'}`}
        />
      </div>

      {/* Defect Lifecycle Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card className="p-4 border-l-4 border-l-[#F9B504]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">For Checking</p>
              <p className="text-2xl font-medium mt-1">
                {defectStatus.for_checking}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[#F9B504]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#7D6A55]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Checked</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.checked}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-[#7D6A55]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">False +</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.false_positive}</p>
            </div>
            <X className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#7D6A55]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Assigned</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.assigned}</p>
            </div>
            <Users className="h-8 w-8 text-[#7D6A55]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#F2790D]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.in_progress}</p>
            </div>
            <Clock className="h-8 w-8 text-[#F2790D]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#F9B504]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">For Review</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.for_review}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[#F9B504]" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#7D6A55]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-medium mt-1">{defectStatus.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-[#7D6A55]" />
          </div>
        </Card>
      </div>

      {/* Active Filters Indicator */}
      {(searchQuery || severityFilter !== 'all' || typeFilter !== 'all') && (
        <div className="flex items-center gap-2 bg-[#7D6A55]/10 border border-[#7D6A55]/20 rounded-lg p-3">
          <Filter className="h-4 w-4 text-[#7D6A55]" />
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <span className="text-sm">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-[#E6071F]">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {severityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Severity: {severityFilter}
                <button onClick={() => setSeverityFilter('all')} className="ml-1 hover:text-[#E6071F]">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 capitalize">
                Type: {typeFilter}
                <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-[#E6071F]">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSeverityFilter('all');
              setTypeFilter('all');
            }}
          >
            Clear All
          </Button>
        </div>
      )}

      
      <Card className="p-4 bg-[#FAFAF8]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {showDefects && showRoughness ? (
            <>
              
              <div className="space-y-2">
                <Label className="text-xs">Defect Type</Label>
                <Select value={typeFilter} onValueChange={(value: Defect['type'] | 'all') => setTypeFilter(value)}>
                  <SelectTrigger className="h-9">
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
              <div className="space-y-2">
                <Label className="text-xs">Defect Severity</Label>
                <Select value={severityFilter} onValueChange={(value: DefectSeverity | 'all') => setSeverityFilter(value)}>
                  <SelectTrigger className="h-9">
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

              {/* IRI Level Filter */}
              <div className="space-y-2">
                <Label className="text-xs">IRI Level</Label>
                <Select value={iriFilter} onValueChange={(value: 'all' | DefectSeverity) => setIriFilter(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All IRI Levels</SelectItem>
                    <SelectItem value="critical">Critical (≥5.0)</SelectItem>
                    <SelectItem value="high">High (3.5-5.0)</SelectItem>
                    <SelectItem value="moderate">Moderate (2.5-3.5)</SelectItem>
                    <SelectItem value="low">Low (&lt;2.5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : showDefects && !showCoverage ? (
            <>
              {/* Defect Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Defect Type</Label>
                <Select value={typeFilter} onValueChange={(value: Defect['type'] | 'all') => setTypeFilter(value)}>
                  <SelectTrigger className="h-9">
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
              <div className="space-y-2">
                <Label className="text-xs">Defect Severity</Label>
                <Select value={severityFilter} onValueChange={(value: DefectSeverity | 'all') => setSeverityFilter(value)}>
                  <SelectTrigger className="h-9">
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
            </>
          ) : showRoughness ? (
            <>
              {/* IRI Level Filter for Roughness Mode */}
              <div className="space-y-2">
                <Label className="text-xs">IRI Level</Label>
                <Select value={iriFilter} onValueChange={(value: 'all' | DefectSeverity) => setIriFilter(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All IRI Levels</SelectItem>
                    <SelectItem value="critical">Critical (≥5.0)</SelectItem>
                    <SelectItem value="high">High (3.5-5.0)</SelectItem>
                    <SelectItem value="moderate">Moderate (2.5-3.5)</SelectItem>
                    <SelectItem value="low">Low (&lt;2.5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Filters</Label>
                <p className="text-xs text-muted-foreground pt-2">
                  Showing {allSegments.length} segment{allSegments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Coverage Mode</Label>
              <p className="text-xs text-muted-foreground">
                Showing all segments with inspection frequency data
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Map and Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section - Left/Center */}
        <div className="lg:col-span-2">
          {/* Map Card */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b bg-[#FAFAF8]">
              <div className="flex items-center justify-between">
                <div>
                  <h3>Road Network Map</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click on markers for details
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showDefects ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowDefects(!showDefects)}
                    className={showDefects ? "bg-[#7D6A55] hover:bg-[#6A5A47]" : ""}
                  >
                    <Layers className="h-4 w-4 mr-1" />
                    Defects
                  </Button>
                  <Button
                    variant={showRoughness ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowRoughness(!showRoughness);
                      if (!showRoughness) setShowCoverage(false);
                    }}
                    className={showRoughness ? "bg-[#7D6A55] hover:bg-[#6A5A47]" : ""}
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Roughness
                  </Button>
                  <Button
                    variant={showCoverage ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowCoverage(!showCoverage);
                      if (!showCoverage) setShowRoughness(false);
                    }}
                    className={showCoverage ? "bg-[#7D6A55] hover:bg-[#6A5A47]" : ""}
                  >
                    <MapIcon className="h-4 w-4 mr-1" />
                    Coverage
                  </Button>
                </div>
              </div>
            </div>
            <div className="h-[600px] relative">
              
              
               
                <DefectMap
                  key={allSegments.length}
                  defects={showDefects ? filteredDefects : []}
                  segments={showRoughness || showCoverage ? allSegmentsRaw : []}
                  filteredSegments={allSegments}
                  onDefectClick={handleDefectClick}
                  onSegmentClick={handleSegmentClick}
                  highlightCritical={true}
                  showRoughness={showRoughness}
                  showFrequency={showCoverage}
                  hideOverlay={true}
                  externalSelectedDefect={selectedDefect}
                  externalSelectedSegment={selectedSegment}
                  centerOn={mapCenter}
                />
              
            </div>
          </Card>

          {/* Quick Stats - Below Map */}
          {/* <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Defects</p>
                <p className="text-2xl font-semibold text-[#7D6A55]">{filteredDefects.length}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#E6071F]" />
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
                <p className="text-2xl font-semibold text-[#E6071F]">
                  {filteredDefects.filter(d => d.severity === 'critical').length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#F2790D]" />
                  <p className="text-sm text-muted-foreground">High</p>
                </div>
                <p className="text-2xl font-semibold text-[#F2790D]">
                  {filteredDefects.filter(d => d.severity === 'high').length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Segments</p>
                <p className="text-2xl font-semibold text-gray-600">
                  {allSegments.length}
                </p>
              </div>
            </Card>
          </div> */}
        </div>

        {/* Right Panel - Defect/Segment Details or Combined List */}
        {selectedDefect ? (
          <div style={{ height: 'calc(600px + 73px)' }}>
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
            />
          </div>
        ) : selectedSegment ? (
          <div style={{ height: 'calc(600px + 73px)' }}>
            <SegmentDetailsCard
              segment={selectedSegment}
              onClose={() => setSelectedSegment(null)}
            />
          </div>
        ) : (
          <Card className="p-0 overflow-hidden flex flex-col" style={{ height: 'calc(600px + 73px)' }}>
            <div className="p-4 border-b bg-[#FAFAF8]">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-[#7D6A55]" />
                <h3>
                  {showDefects && (showRoughness || showCoverage)
                    ? 'Defects & Segments'
                    : showDefects
                    ? 'Defect List'
                    : 'Road Segments'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {showDefects && `${filteredDefects.length} defect${filteredDefects.length !== 1 ? 's' : ''}`}
                {showDefects && (showRoughness || showCoverage) && ', '}
                {(showRoughness || showCoverage) && `${allSegments.length} segment${allSegments.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Combined List */}
            <div className="divide-y flex-1 overflow-y-auto" ref={listContainerRef}>
              {listItems.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No items to display</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your filters or layer selection
                  </p>
                </div>
              ) : (
                listItems.map((item, index) => {
                  if (item.type === 'defect') {
                    const defect = item.data;
                    const sel = selectedDefect as Defect | null;
                    const isSelected = sel != null && sel.id === defect.id;
                    return (
                      <div
                        key={`defect-${defect.id}`}
                        ref={el => {
                          if (el) listItemRefs.current.set(`defect-${defect.id}`, el);
                        }}
                        className={`p-3 hover:bg-[#F5F3F0] transition-all cursor-pointer ${
                          isSelected ? 'bg-[#7D6A55]/10 border-l-4 border-l-[#7D6A55]' : ''
                        }`}
                        onClick={() => handleListItemClick(item)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#7D6A55]" />
                                <span className="font-medium text-sm">{defect.id}</span>
                                {/* <Badge 
                                  variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {`${defect.severity} severity`}
                                </Badge> */}
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
                              <span className="text-muted-foreground">Segment:</span>
                              <span className="text-sm truncate">{defect.segment}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const segment = item.data;
                    const sel = selectedSegment as RoadSegment | null;
                    const isSelected = sel != null && sel.id === segment.id;
                    const getIRIColor = (iri: number) => {
                      if (iri >= 5.0) return '#E6071F';
                      if (iri >= 4.0) return '#F2790D';
                      if (iri >= 3.0) return '#F9B504';
                      return '#7D6A55';
                    };
                    return (
                      <div
                        key={`segment-${segment.id}`}
                        ref={el => {
                          if (el) listItemRefs.current.set(`segment-${segment.id}`, el);
                        }}
                        className={`p-3 hover:bg-[#F5F3F0] transition-all cursor-pointer ${
                          isSelected ? 'bg-[#7D6A55]/10 border-l-4 border-l-[#7D6A55]' : ''
                        }`}
                        onClick={() => handleListItemClick(item)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-[#7D6A55]" />
                                <span className="font-medium text-sm">{segment.id}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{segment.name}</p>
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            {showRoughness && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">IRI:</span>
                                <Badge 
                                  style={{ 
                                    backgroundColor: getIRIColor(segment.iri), 
                                    color: 'white' 
                                  }}
                                  className="text-xs"
                                >
                                  {segment.iri.toFixed(2)}
                                </Badge>
                              </div>
                            )}
                            {showCoverage && segment.frequencyCount !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Frequency:</span>
                                <span className="text-sm">{segment.frequencyCount} inspections</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Assignment Dialog */}
      <SendToMaintenanceDialog
        defect={selectedDefect}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleAssignment}
      />

      {/* Change Status Dialog */}
      {currentDefectForStatusChange && (
        <ChangeStatusDialog
          open={changeStatusDialogOpen}
          onOpenChange={setChangeStatusDialogOpen}
          currentStatus={currentDefectForStatusChange.status}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
