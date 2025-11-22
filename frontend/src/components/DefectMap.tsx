import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Defect, RoadSegment } from '../types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface DefectMapProps {
  defects?: Defect[];
  segments?: RoadSegment[];
  filteredSegments?: RoadSegment[];
  onDefectClick?: (defect: Defect) => void;
  onSegmentClick?: (segment: RoadSegment) => void;
  highlightCritical?: boolean;
  showFrequency?: boolean;
  showRoughness?: boolean;
  hideOverlay?: boolean;
  focusedDefectId?: string | null;
  externalSelectedDefect?: Defect | null;
  externalSelectedSegment?: RoadSegment | null;
  centerOn?: { lat: number; lng: number } | null;
}


function MapController({ centerOn, focusedDefectId, defects, selectedSegment, selectedDefect }: any) {
  const map = useMap();

  useEffect(() => {
    if (centerOn) {
      
      map.panTo([centerOn.lat, centerOn.lng], { animate: true });
    }
  }, [centerOn, map]);

  useEffect(() => {
    if (focusedDefectId) {
      const defect = defects.find((d: Defect) => d.id === focusedDefectId);
      if (defect) {
        
        map.setView([defect.coordinates.lat, defect.coordinates.lng], 18, { animate: true });
      }
    }
  }, [focusedDefectId, defects, map]);

  useEffect(() => {
    if (selectedDefect && selectedDefect.coordinates) {
      // Zoom into selected defect
      map.setView([selectedDefect.coordinates.lat, selectedDefect.coordinates.lng], 17, { animate: true });
    }
  }, [selectedDefect, map]);

  useEffect(() => {
    if (selectedSegment && selectedSegment.coordinates && selectedSegment.coordinates.length > 0) {
      const midIndex = Math.floor(selectedSegment.coordinates.length / 2);
      const mid = selectedSegment.coordinates[midIndex];
      // Zoom into selected segment
      map.setView([mid.lat, mid.lng], 16, { animate: true });
    }
  }, [selectedSegment, map]);

  return null;
}

export function DefectMap({
  defects = [],
  segments = [],
  filteredSegments,
  onDefectClick,
  onSegmentClick,
  highlightCritical = false,
  showFrequency = false,
  showRoughness = false,
  hideOverlay = false,
  focusedDefectId,
  externalSelectedDefect,
  externalSelectedSegment,
  centerOn
}: DefectMapProps) {
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [internalSelectedSegment, setInternalSelectedSegment] = useState<RoadSegment | null>(null);

  const selectedSegment = externalSelectedSegment !== undefined ? externalSelectedSegment : internalSelectedSegment;

  
  const defaultCenter: [number, number] = segments.length > 0 && segments[0].coordinates && segments[0].coordinates.length > 0
    ? [segments[0].coordinates[0].lat, segments[0].coordinates[0].lng]
    : [1.35, 103.98];

  const getSeverityColor = (defect: Defect) => {
    if (defect.status === 'completed') {
      return '#9CA3AF';
    }

    switch (defect.severity) {
      case 'critical': return '#E6071F';
      case 'high': return '#F2790D';
      case 'moderate': return '#F9B504';
      case 'low': return '#7D6A55';
      default: return '#6B7280';
    }
  };

  const getFrequencyColor = (count: number) => {
    if (count > 80) return '#E6071F';
    if (count > 60) return '#F2790D';
    if (count > 40) return '#F9B504';
    if (count > 20) return '#7D6A55';
    return '#705E4E';
  };

  const getIRIColor = (iri: number) => {
    if (iri >= 5.0) return '#E6071F';
    if (iri >= 3.5) return '#F2790D';
    if (iri >= 2.5) return '#F9B504';
    return '#7D6A55';
  };

  const handleDefectClick = (defect: Defect) => {
    setSelectedDefect(defect);
    setInternalSelectedSegment(null);
    onDefectClick?.(defect);
  };

  const handleSegmentClick = (segment: RoadSegment) => {
    if (showRoughness && filteredSegments) {
      const isFiltered = filteredSegments.some(s => s.id === segment.id);
      if (!isFiltered) {
        return;
      }
    }

    setInternalSelectedSegment(segment);
    setSelectedDefect(null);
    onSegmentClick?.(segment);
  };

  useEffect(() => {
    if (hideOverlay && externalSelectedDefect !== undefined) {
      setSelectedDefect(externalSelectedDefect);
      if (externalSelectedDefect === null) {
        setInternalSelectedSegment(null);
      }
    }
  }, [externalSelectedDefect, hideOverlay]);

  
  const createDefectIcon = (defect: Defect) => {
    const color = getSeverityColor(defect);
    const isSelected = selectedDefect?.id === defect.id;
    const size = isSelected ? 40 : 30;

    return L.divIcon({
      className: 'custom-defect-marker',
      html: `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          ${isSelected ? 'box-shadow: 0 0 0 4px rgba(255,255,255,0.8), 0 4px 6px rgba(0,0,0,0.3);' : ''}
          ${defect.status === 'completed' ? 'opacity: 0.6;' : ''}
          position: relative;
        ">
          ${defect.isWorsening ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background: #E6071F;
              border-radius: 50%;
              border: 2px solid white;
              animation: pulse 2s infinite;
            "></div>
          ` : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size]
    });
  };

  console.log("🔍 DefectMap Debug:");
  console.log("segments received:", segments?.length);
  console.log("filteredSegments received:", filteredSegments?.length);
  console.log("=== SEGMENT COORDINATE CHECK ===");
  segments.forEach((s, idx) => {
    console.log(
      `#${idx + 1} Segment ${s.id} (${s.name}) → coords:`,
      Array.isArray(s.coordinates) ? s.coordinates.length : "NULL"
    );

    if (!s.coordinates || !Array.isArray(s.coordinates)) {
      console.warn(`❌ Segment ${s.id} has NO coordinates (NULL)`);
    } else if (s.coordinates.length < 2) {
      console.warn(`⚠️ Segment ${s.id} has < 2 coordinates → not renderable`);
    } else {
      console.log(`✅ coords OK`);
    }
  });

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-[600] bg-white p-3 rounded-lg shadow-lg">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#7D6A55]">
            {showRoughness ? 'IRI Level' : showFrequency ? 'Frequency' : 'Severity'}
          </p>
          {showRoughness ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#E6071F]" />
                <span>Critical (≥5.0)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F2790D]" />
                <span>High (3.5-5.0)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F9B504]" />
                <span>Moderate (2.5-3.5)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#7D6A55]" />
                <span>Low ({'<'}2.5)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-gray-400 opacity-60" />
                <span>Filtered Out</span>
              </div>
            </>
          ) : showFrequency ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#E6071F]" />
                <span>{'>'} 80</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F2790D]" />
                <span>60-80</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F9B504]" />
                <span>40-60</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#7D6A55]" />
                <span>{'<'} 40</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#E6071F]" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F2790D]" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#F9B504]" />
                <span>Moderate</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#7D6A55]" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-gray-400 opacity-60" />
                <span>Resolved</span>
              </div>
            </>
          )}
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={true}
      >
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        
        <MapController
          centerOn={centerOn}
          focusedDefectId={focusedDefectId}
          defects={defects}
          selectedSegment={selectedSegment}
          selectedDefect={selectedDefect}
        />

        {/* Road Segments as Polylines */}
        {segments.map((segment) => {
          if (!segment.coordinates || segment.coordinates.length < 2) return null;

        
          const isFilteredOut = (showRoughness || showFrequency) && filteredSegments
            ? !filteredSegments.some(s => s.id === segment.id)
            : false;

          
          if (isFilteredOut) return null;

          const positions: [number, number][] = segment.coordinates.map(c => [c.lat, c.lng]);

          const color = showRoughness
            ? getIRIColor(segment.iri)
            : showFrequency
              ? getFrequencyColor(segment.frequencyCount || 0)
              : segment.isCritical || highlightCritical
                ? '#E6071F'
                : '#7D6A55';

          return (
            <Polyline
              key={segment.id}
              positions={positions}
              pathOptions={{
                color: color,
                weight: selectedSegment?.id === segment.id ? 8 : 5,
                opacity: selectedSegment?.id === segment.id ? 1 : 0.7,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => handleSegmentClick(segment)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-medium">{segment.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {segment.zone} • {segment.length} km
                  </p>
                  <div className="flex gap-4 text-sm mt-2">
                    <span>IRI: <span className="font-medium">{segment.iri}</span></span>
                    <span>Defects: <span className="font-medium">{segment.defectCount}</span></span>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Defect Markers */}
        {defects.map((defect) => (
          <Marker
            key={defect.id}
            position={[defect.coordinates.lat, defect.coordinates.lng]}
            icon={createDefectIcon(defect)}
            eventHandlers={{
              click: () => handleDefectClick(defect)
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{defect.id}</h4>
                  <Badge variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {defect.severity}
                  </Badge>
                  {defect.isWorsening && (
                    <Badge variant="destructive">Worsening</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {defect.type} • {defect.location}
                </p>
                <p className="text-sm mt-1">
                  Status: <span className="font-medium">{defect.status.replace('_', ' ')}</span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      
      {!hideOverlay && selectedDefect && (
        <div className="absolute bottom-4 left-4 right-4 z-[600]">
          <Card className="p-4 bg-white shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedDefect.id}</h4>
                  <Badge variant={selectedDefect.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {selectedDefect.severity}
                  </Badge>
                  {selectedDefect.isWorsening && (
                    <Badge variant="destructive">Worsening</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedDefect.type} • {selectedDefect.location}
                </p>
                <p className="text-sm">
                  Status: <span className="font-medium">{selectedDefect.status.replace('_', ' ')}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDefect(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

     
      {!hideOverlay && selectedSegment && (
        <div className="absolute bottom-4 left-4 right-4 z-[600]">
          <Card className="p-4 bg-white shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedSegment.name}</h4>
                  {selectedSegment.isCritical && (
                    <Badge variant="destructive">Critical</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedSegment.zone} • {selectedSegment.length} km
                </p>
                <div className="flex gap-4 text-sm">
                  <span>IRI: <span className="font-medium">{selectedSegment.iri}</span></span>
                  <span>Defects: <span className="font-medium">{selectedSegment.defectCount}</span></span>
                  {showFrequency && (
                    <span>Frequency: <span className="font-medium">{selectedSegment.frequencyCount}</span></span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInternalSelectedSegment(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        .custom-defect-marker {
          background: transparent;
          border: none;
        }

        .leaflet-container {
          font-family: inherit;
          z-index: 0 !important;
        }

        .leaflet-pane {
          z-index: 400 !important;
        }

        .leaflet-top,
        .leaflet-bottom {
          z-index: 450 !important;
        }

        .leaflet-popup {
          z-index: 500 !important;
        }

        .leaflet-control {
          z-index: 450 !important;
        }
      `}</style>
    </div>
  );
}
