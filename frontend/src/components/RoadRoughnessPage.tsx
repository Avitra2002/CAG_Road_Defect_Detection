import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { StatCard } from './StatCard';
import { DefectMap } from './DefectMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { RoadSegment, Defect, DefectSeverity, DefectPriority } from '../types';
import { TrendingUp, AlertTriangle, MapPin, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { segmentApi } from '../api/segments';
import { defectApi } from '../api/defects';

export function RoadRoughnessPage() {
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState('30');
  const [severityFilter, setSeverityFilter] = useState<'all' | DefectSeverity>('critical');
  const segmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [, forceUpdate] = useState({});
  

  
  const iriThreshold = 4.0;
  const [allSegments, setAllSegments] = useState<RoadSegment[]>([]);
  const [criticalSegments, setCriticalSegments] = useState<RoadSegment[]>([]);
  const [segmentsAboveThreshold, setSegmentsAboveThreshold] = useState<RoadSegment[]>([]);
  const [avgIRI, setAvgIRI] = useState(0);

  useEffect(() => {
    async function load() {
      const all = await segmentApi.getAll();
      const crit = await segmentApi.getCritical();
      const avg = await segmentApi.getAverageIRI();
      const above = await segmentApi.getAboveThreshold(iriThreshold);

      setAllSegments(all);
      setCriticalSegments(crit);
      setAvgIRI(avg.average || 0);
      setSegmentsAboveThreshold(above);
    }

    load();
  }, []);
    
  const refresh = async () => {
    const all = await segmentApi.getAll();
    const crit = await segmentApi.getCritical();
    const avg = await segmentApi.getAverageIRI();
    const above = await segmentApi.getAboveThreshold(iriThreshold);

    setAllSegments(all);
    setCriticalSegments(crit);
    setAvgIRI(avg.average || 0);
    setSegmentsAboveThreshold(above);
  };
  
  // Filter segments based on severity
  const filteredSegments = useMemo(() => {
    if (!allSegments.length) return [];
    if (severityFilter === 'all') return allSegments;
    if (severityFilter === 'critical') return criticalSegments;

    const iriRanges = {
      critical: [5.0, Infinity],
      high: [3.5, 5.0],
      moderate: [2.5, 3.5],
      low: [0, 2.5]
    };

    const [min, max] = iriRanges[severityFilter];

    return allSegments.filter(s => s.iri >= min && s.iri < max);
  }, [severityFilter, allSegments, criticalSegments]);

  // Scroll to selected segment
  useEffect(() => {
    if (selectedSegment && segmentRefs.current[selectedSegment.id]) {
      const element = segmentRefs.current[selectedSegment.id];
      const container = element?.parentElement;
      
      if (element && container) {

        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const scrollOffset = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
        
      
        container.scrollTo({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedSegment]);

  // Generate IRI trend data
  const iriTrendData = useMemo(() => {
    const days = parseInt(timePeriod);
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        avgIRI: (3.0 + Math.random() * 1.5).toFixed(2),
        threshold: iriThreshold
      };
    });
  }, [timePeriod]);

  const segmentIRIData = allSegments
    .map(s => ({ name: s.name, iri: s.iri }))
    .sort((a, b) => b.iri - a.iri);

  const getIRIColor = (iri: number) => {
    if (iri < 2.5) return '#7D6A55';
    if (iri < 3.5) return '#F9B504';
    if (iri < 5.0) return '#F2790D';
    return '#E6071F';
  };

  const getIRIQuality = (iri: number) => {
    if (iri < 2.5) return 'Excellent';
    if (iri < 3.5) return 'Good';
    if (iri < 5.0) return 'Fair';
    if (iri < 7.0) return 'Poor';
    return 'Very Poor';
  };

  // const handleAssignSegment = (segment: RoadSegment, isPriorityRepair: boolean = false) => {
  //   const mockDefect: Defect = {
  //     id: segment.id.toString(),
  //     type: 'roughness',
  //     severity: segment.isCritical ? 'critical' : 'high',
  //     status: 'for_checking',
  //     priority: isPriorityRepair ? 'urgent' : (segment.isCritical ? 'urgent' : 'high'),
  //     location: `${segment.name} - ${segment.zone}`,
  //     coordinates: { lat: 1.35, lng: 103.98 },
  //     detectedAt: segment.lastInspected || new Date(),
  //     segment: segment.name,
  //     zone: segment.zone,
  //     ageInDays: 0,
  //   };
  //   setSelectedDefect(mockDefect);
  //   setAssignDialogOpen(true);
  // };


  const handleAssignment = async (
    defectId: string,
    team: string,
    type: 'ops' | 'maintenance',
    priority?: string
  ) => {
  
    if (type === 'maintenance') {
      await defectApi.assignMaintenance(
        Number(defectId),      
        Number(team),   
        priority || "normal"  
      );

      toast.success(`Assigned to maintenance`);
      refresh();
      return;
    }

    // OPS assignment (if needed)
    toast.success(`Assigned to OPS team`);
    refresh();
  };

  const handleMapSegmentClick = (segment: RoadSegment) => {
    setSelectedSegment(segment);
  };

  console.log("🔥 RoughnessPage Debug:");
console.log("allSegments:", allSegments.length);
console.log("criticalSegments:", criticalSegments.length);
console.log("filteredSegments:", filteredSegments.length);
console.log("severityFilter:", severityFilter);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1>Road Roughness Analysis</h1>
        <p className="text-muted-foreground">
          Monitor International Roughness Index (IRI) across the road network
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Average IRI"
          value={avgIRI}
          icon={TrendingUp}
          trend={avgIRI < iriThreshold ? 'Below threshold (Good)' : 'Above threshold (Action Required)'}
          className={`border-l-4 ${avgIRI < iriThreshold ? 'border-l-[#7D6A55]' : 'border-l-[#E6071F]'}`}
        />
        <StatCard
          title="Segments Above Threshold"
          value={segmentsAboveThreshold.length}
          icon={AlertTriangle}
          trend={`Threshold: ${iriThreshold} m/km`}
          className="border-l-4 border-l-[#F2790D]"
        />
        <StatCard
          title="Critical Segments"
          value={criticalSegments.length}
          icon={MapPin}
          trend="Requires immediate attention"
          className="border-l-4 border-l-[#E6071F]"
        />
      </div>

      {/* Map and Critical Segments List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Roughness Map */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b bg-[#FAFAF8]">
            <h3>Road Roughness Map</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Segments color-coded by IRI severity
            </p>
          </div>
          <div className="h-[600px]">
            <DefectMap
              key= {allSegments.length}
              segments={allSegments}
              filteredSegments={filteredSegments}
              externalSelectedSegment={selectedSegment}
              
              onSegmentClick={handleMapSegmentClick}
              highlightCritical={false}
              showRoughness={true}
              hideOverlay={true}
            />
          </div>
        </Card>

        {/* Segments List with Filter */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b bg-[#FAFAF8] space-y-3">
            <div>
              <h3>Segments by Severity</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSegments.length} segments
              </p>
            </div>
            
            {/* Severity Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Filter className="h-3 w-3" />
                Filter by Severity
              </Label>
              <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as any)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical (IRI ≥ 5.0)</SelectItem>
                  <SelectItem value="high">High (IRI 3.5-5.0)</SelectItem>
                  <SelectItem value="moderate">Moderate (IRI 2.5-3.5)</SelectItem>
                  <SelectItem value="low">Low (IRI {'<'} 2.5)</SelectItem>
                  <SelectItem value="all">All Segments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredSegments.map(segment => {
              const getSeverityBadge = (iri: number) => {
                if (iri >= 5.0) return <Badge variant="destructive">Critical Roughness</Badge>;
                if (iri >= 3.5) return <Badge className="bg-[#F2790D] text-white">High Roughness</Badge>;
                if (iri >= 2.5) return <Badge className="bg-[#F9B504] text-gray-900">Moderate Roughness</Badge>;
                return <Badge className="bg-[#7D6A55] text-white">Low Roughness</Badge>;
              };
              
              return (
                <div 
                  key={segment.id}
                  ref={el => {segmentRefs.current[segment.id] = el;}}
                  className={`p-4 hover:bg-[#F5F3F0] transition-colors cursor-pointer ${
                    selectedSegment?.id === segment.id ? 'bg-[#F5F3F0] border-l-4 border-l-[#E6071F]' : ''
                  }`}
                  onClick={() => setSelectedSegment(segment)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{segment.name}</h4>
                        <p className="text-sm text-muted-foreground">{segment.zone}</p>
                      </div>
                      {getSeverityBadge(segment.iri)}
                    </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">IRI Value</p>
                      <p className="font-medium" style={{ color: getIRIColor(segment.iri) }}>
                        {segment.iri} m/km
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Quality</p>
                      <p className="font-medium">{getIRIQuality(segment.iri)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Length</p>
                      <p className="font-medium">{segment.length} km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Defects</p>
                      <p className="font-medium">{segment.defectCount}</p>
                    </div>
                  </div>

                  {selectedSegment?.id === segment.id && (
                    <div className="pt-2 space-y-2">
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Last Inspected</p>
                        <p className="font-medium">{segment.lastInspected?.toLocaleDateString()}</p>
                      </div>
                      {/* <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignSegment(segment, false);
                          }}
                          className="flex-1 text-xs"
                        >
                          Assign to Ops
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignSegment(segment, true);
                          }}
                          className="flex-1 bg-[#E6071F] hover:bg-[#C00619] text-xs"
                        >
                          Escalate
                        </Button>
                      </div> */}
                    </div>
                  )}
                </div>
              </div>
            );
            })}
            {filteredSegments.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No segments found</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* IRI per Segment */}
      <Card className="p-6">
        <h3 className="mb-4">IRI by Segment</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={segmentIRIData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
            <XAxis type="number" stroke="#7D6A55" domain={[0, 8]} />
            <YAxis dataKey="name" type="category" width={150} stroke="#7D6A55" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#FAFAF8', border: '1px solid #E0D5C7' }}
              formatter={(value: number) => [`${value} m/km`, 'IRI']}
            />
            <Bar dataKey="iri" radius={[0, 8, 8, 0]}>
              {segmentIRIData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getIRIColor(entry.iri)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E6071F' }} />
            <span>Poor/Very Poor ({'>'}5.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F2790D' }} />
            <span>Fair (3.5-5.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F9B504' }} />
            <span>Good (2.5-3.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#7D6A55' }} />
            <span>Excellent ({'<'}2.5)</span>
          </div>
        </div>
      </Card>

      {/* IRI Over Time */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#7D6A55]" />
            <h3>IRI Trend Over Time</h3>
          </div>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={iriTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C7" />
            <XAxis dataKey="date" stroke="#7D6A55" fontSize={12} />
            <YAxis stroke="#7D6A55" domain={[0, 6]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#FAFAF8', border: '1px solid #E0D5C7' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="avgIRI" 
              stroke="#7D6A55" 
              name="Average IRI" 
              strokeWidth={2}
              dot={{ fill: '#7D6A55', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="threshold" 
              stroke="#E6071F" 
              name="Threshold" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      
      <Card className="p-4 bg-[#F5F3F0]">
        <h4 className="font-medium mb-3">IRI Quality Standards (m/km)</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#7D6A55', color: 'white' }}>
              {'<'}2.5
            </div>
            <span className="font-medium">Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#F9B504' }}>
              2.5-3.5
            </div>
            <span className="font-medium">Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#F2790D', color: 'white' }}>
              3.5-5.0
            </div>
            <span className="font-medium">Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#E6071F', color: 'white' }}>
              5.0-7.0
            </div>
            <span className="font-medium">Poor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#E6071F', color: 'white' }}>
              {'>'}7.0
            </div>
            <span className="font-medium">Very Poor</span>
          </div>
        </div>
      </Card>


    </div>
  );
}
