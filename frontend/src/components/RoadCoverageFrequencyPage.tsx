import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { StatCard } from './StatCard';
import { DefectMap } from './DefectMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
// import { mockRoadSegments } from '../lib/mockData';
import { segmentApi } from '../api/segments';
import { RoadSegment } from '../types';
import { MapPin, TrendingUp, AlertTriangle, Filter } from 'lucide-react';

type FrequencyLevel = 'all' | 'very-high' | 'high' | 'medium' | 'low' | 'very-low';

export function RoadCoverageFrequencyPage() {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyLevel>('all');
  const segmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    async function load() {
      const data = await segmentApi.getAll(); // GET /segments
      setSegments(data);
    }
    load();
  }, []);


  // Filter segments based on frequency
  const filteredSegments = useMemo(() => {
    if (frequencyFilter === 'all') return segments;
    
    const frequencyRanges: Record<FrequencyLevel, [number, number]> = {
      'all': [0, Infinity],
      'very-high': [80, Infinity],
      'high': [60, 80],
      'medium': [40, 60],
      'low': [20, 40],
      'very-low': [0, 20]
    };
    
    const [min, max] = frequencyRanges[frequencyFilter];
    return segments.filter(s => {
      const count = s.frequencyCount || 0;
      return count >= min && (max === Infinity ? true : count < max);
    });
  }, [segments,frequencyFilter]);

 
  useEffect(() => {
    // if (selectedSegment && segmentRefs.current[selectedSegment.id]) {
    if (selectedSegment && segments.length > 0) {
      const element = segmentRefs.current[selectedSegment.id];
      const container = element?.parentElement;
      
      if (element && container) {
        // Scroll within the container only, not the main page
        const scrollOffset = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
        
        container.scrollTo({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedSegment]);

  const handleMapSegmentClick = (segment: RoadSegment) => {
    
    if (frequencyFilter !== 'all' && filteredSegments) {
      const isFiltered = filteredSegments.some(s => s.id === segment.id);
      if (!isFiltered) {
        return;
      }
    }
    setSelectedSegment(segment);
  };

  const getFrequencyColor = (count: number) => {
    if (count > 80) return { bg: '#E6071F', text: 'white', label: 'Very High Coverage' };
    if (count > 60) return { bg: '#F2790D', text: 'white', label: 'High Coverage' };
    if (count > 40) return { bg: '#F9B504', text: 'black', label: 'Medium Coverage' };
    if (count > 20) return { bg: '#7D6A55', text: 'white', label: 'Low Coverage' };
    return { bg: '#705E4E', text: 'white', label: 'Very Low Coverage' };
  };

  const totalInspections = segments.reduce((sum, s) => sum + (s.frequencyCount || 0), 0);
  const avgFrequency = (totalInspections / segments.length).toFixed(1);
  const highTrafficSegments = segments.filter(s => (s.frequencyCount || 0) > 60).length;

  console.log("SEGMENTS LOADED:", segments);
  console.log("FILTERED SEGMENTS:", filteredSegments);
  return (
    <div className="space-y-6 p-6">
      
      <div>
        <h1>Road Coverage Frequency</h1>
        <p className="text-muted-foreground">
          Inspection frequency across the 75km road network
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Inspections"
          value={totalInspections}
          icon={MapPin}
          trend="Last 30 days"
          className="border-l-4 border-l-[#7D6A55]"
        />
        <StatCard
          title="Average Frequency"
          value={avgFrequency}
          icon={TrendingUp}
          trend="Per segment"
          className="border-l-4 border-l-[#F2790D]"
        />
        <StatCard
          title="High Traffic Segments"
          value={highTrafficSegments}
          icon={AlertTriangle}
          trend="Frequency > 60"
          className="border-l-4 border-l-[#E6071F]"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Very High (>80)', color: '#E6071F', count: segments.filter(s => (s.frequencyCount || 0) > 80).length },
          { label: 'High (60-80)', color: '#F2790D', count: segments.filter(s => (s.frequencyCount || 0) > 60 && (s.frequencyCount || 0) <= 80).length },
          { label: 'Medium (40-60)', color: '#F9B504', count: segments.filter(s => (s.frequencyCount || 0) > 40 && (s.frequencyCount || 0) <= 60).length },
          { label: 'Low (20-40)', color: '#7D6A55', count: segments.filter(s => (s.frequencyCount || 0) > 20 && (s.frequencyCount || 0) <= 40).length },
          { label: 'Very Low (<20)', color: '#705E4E', count: segments.filter(s => (s.frequencyCount || 0) <= 20).length },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs font-medium">{item.label}</p>
              </div>
              <p className="text-2xl font-medium">{item.count}</p>
              <p className="text-xs text-muted-foreground">
                {((item.count / segments.length) * 100).toFixed(1)}% of segments
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Map and Segments List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2D Frequency Map */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b bg-[#FAFAF8]">
            <h3>Coverage Frequency Heat Map</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Segments color-coded by inspection frequency
            </p>
          </div>
          <div className="h-[600px]">
            <DefectMap
              key= {segments.length}
              segments={segments}
              filteredSegments={filteredSegments}
              externalSelectedSegment={selectedSegment}
              onSegmentClick={handleMapSegmentClick}
              showFrequency={true}
              hideOverlay={true}
            />
          </div>
        </Card>

        {/* Segments List with Filter */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b bg-[#FAFAF8] space-y-3">
            <div>
              <h3>Segments by Frequency</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSegments.length} segments
              </p>
            </div>
            
            {/* Frequency Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Filter className="h-3 w-3" />
                Filter by Frequency
              </Label>
              <Select value={frequencyFilter} onValueChange={(value) => setFrequencyFilter(value as FrequencyLevel)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-high">Very High ({'>'}80)</SelectItem>
                  <SelectItem value="high">High (60-80)</SelectItem>
                  <SelectItem value="medium">Medium (40-60)</SelectItem>
                  <SelectItem value="low">Low (20-40)</SelectItem>
                  <SelectItem value="very-low">Very Low ({'<'}20)</SelectItem>
                  <SelectItem value="all">All Segments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredSegments.map(segment => {
              console.log("LIST ITEM:", {
              id: segment.id,
              typeofId: typeof segment.id,
              freq: segment.frequencyCount});
              const frequencyCount = segment.frequencyCount || 0;
              const colorInfo = getFrequencyColor(frequencyCount);
              
              return (
                <div 
                  key={segment.id}
                  ref={el => {segmentRefs.current[segment.id] = el;}}
                  className={`p-4 hover:bg-[#F5F3F0] transition-colors cursor-pointer ${
                    selectedSegment?.id === segment.id ? 'bg-[#F5F3F0] border-l-4' : ''
                  }`}
                  style={selectedSegment?.id === segment.id ? { borderLeftColor: colorInfo.bg } : {}}
                  onClick={() => setSelectedSegment(segment)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{segment.name}</h4>
                        <p className="text-sm text-muted-foreground">{segment.zone}</p>
                      </div>
                      <Badge 
                        className="text-xs"
                        style={{ backgroundColor: colorInfo.bg, color: colorInfo.text }}
                      >
                        {colorInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Frequency Count</p>
                        <p className="font-medium" style={{ color: colorInfo.bg }}>
                          {frequencyCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Length</p>
                        <p className="font-medium">{segment.length} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">IRI</p>
                        <p className="font-medium">{segment.iri} m/km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Defects</p>
                        <p className="font-medium">{segment.defectCount}</p>
                      </div>
                    </div>

                    {/* Additional info when selected */}
                    {selectedSegment?.id === segment.id && (
                      <div className="pt-2 border-t text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Last Inspected</p>
                            <p className="font-medium text-xs">
                              {segment.lastInspected?.toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Zone</p>
                            <p className="font-medium text-xs">{segment.zone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

    </div>
  );
}
