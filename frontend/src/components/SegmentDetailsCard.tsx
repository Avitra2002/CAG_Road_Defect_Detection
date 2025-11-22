import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RoadSegment } from '../types';
import { 
  Activity,
  MapPin, 
  X,
  TrendingUp,
  Calendar,
  Map
} from 'lucide-react';

interface SegmentDetailsCardProps {
  segment: RoadSegment | null;
  onClose: () => void;
}

export function SegmentDetailsCard({
  segment,
  onClose
}: SegmentDetailsCardProps) {
  if (!segment) {
    return null;
  }

  const getIRIColor = (iri: number) => {
    if (iri >= 5.0) return '#E6071F'; // Critical
    if (iri >= 4.0) return '#F2790D'; // High
    if (iri >= 3.0) return '#F9B504'; // Medium
    return '#7D6A55'; // Low
  };

  const getIRILabel = (iri: number) => {
    if (iri >= 5.0) return 'Critical';
    if (iri >= 4.0) return 'High';
    if (iri >= 3.0) return 'Moderate';
    return 'Good';
  };

  const getFrequencyColor = (count: number) => {
    if (count < 3) {
      return { bg: '#E6071F', text: 'white', label: 'Very Low' };
    }
    if (count < 6) {
      return { bg: '#F9B504', text: 'black', label: 'Medium' };
    }
    return { bg: '#2E7D32', text: 'white', label: 'High' };
  };

  const frequencyInfo = getFrequencyColor(segment.frequencyCount || 0);

  return (
    <Card className="p-0 overflow-hidden h-full flex flex-col">
     
      <div className="p-4 border-b bg-[#FAFAF8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#7D6A55]" />
            <h3>Segment Details</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
            title="Close (Escape)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Road segment information
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="border-l-4 border-l-[#7D6A55] pl-3 py-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[#7D6A55]">{segment.id}</h2>
          </div>
          <p className="text-muted-foreground">
            {segment.name}
          </p>
        </div>

        {/* IRI Status */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Road Roughness (IRI)</p>
          <div className="flex items-center gap-2">
            <div 
              className="px-3 py-1 rounded"
              style={{ 
                backgroundColor: getIRIColor(segment.iri), 
                color: 'white' 
              }}
            >
              <span className="text-2xl font-semibold">{segment.iri.toFixed(2)}</span>
            </div>
            <Badge 
              variant="secondary"
              style={{ 
                backgroundColor: getIRIColor(segment.iri), 
                color: 'white',
                borderColor: getIRIColor(segment.iri)
              }}
            >
              {getIRILabel(segment.iri)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {segment.iri >= 4.0 ? 'Above threshold (4.0)' : 'Within acceptable range'}
          </p>
        </div>

        {/* Coverage Frequency */}
        {segment.frequencyCount !== undefined && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">Inspection Frequency</p>
            <div className="flex items-center gap-2">
              <div 
                className="px-3 py-1 rounded"
                style={{ 
                  backgroundColor: frequencyInfo.bg, 
                  color: frequencyInfo.text 
                }}
              >
                <span className="text-2xl font-semibold">{segment.frequencyCount}</span>
              </div>
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: frequencyInfo.bg, 
                  color: frequencyInfo.text,
                  borderColor: frequencyInfo.bg
                }}
              >
                {frequencyInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Inspections in last 30 days
            </p>
          </div>
        )}
        
        {/* Details Grid */}
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Length</p>
              <p className="text-sm">{segment.length.toFixed(0)} m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lane Count</p>
              <p className="text-sm">{segment.lanes}</p>
            </div>
          </div>

          {segment.lastInspected && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Last Inspected</p>
                <p className="text-sm">{segment.lastInspected.toLocaleDateString()}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Location</p>
            <p className="text-xs bg-gray-100 p-2 rounded">{segment.name}</p>
          </div>

          {segment.isCritical && (
            <div className="border-l-4 border-l-[#E6071F] bg-[#E6071F]/5 p-3 rounded">
              <p className="text-xs text-muted-foreground mb-1">Critical Segment</p>
              <p className="text-sm">
                This segment requires immediate attention
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
