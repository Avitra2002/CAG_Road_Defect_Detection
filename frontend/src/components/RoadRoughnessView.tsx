import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

import { AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { segmentApi } from '../api/segments';
import { useEffect, useState } from 'react';
import { RoadSegment } from '../types';

export function RoadRoughnessView() {
  const [segments, setSegments]= useState<RoadSegment[]>([]);
  // Generate historical IRI data
  const generateIRITrend = (segmentName: string) => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (11 - i));
      return {
        month: month.toLocaleString('default', { month: 'short' }),
        iri: 2.0 + Math.random() * 2.5,
      };
    });
  };
  useEffect(() => {
    async function load() {
      const all = await segmentApi.getAll();
      setSegments(all);
    }
    load();
  }, []);

  const alertSegments = segments.filter(seg => seg.iri > 3.5);
  const avgIRI = segments.reduce((sum, seg) => sum + seg.iri, 0) / segments.length;

  //TODO: CHANGE MOCK
  const vibrationData = segments.map(seg => ({
    name: seg.name,
    avgVibration: (seg.iri * 0.8 + Math.random() * 0.5).toFixed(2),
    maxVibration: (seg.iri * 1.2 + Math.random() * 0.8).toFixed(2),
  }));

  // Impact correlation
  const impactData = segments.map(seg => ({
    name: seg.name,
    iri: seg.iri,
    defects: seg.defectCount,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Average IRI</div>
            <div className="text-3xl">{avgIRI.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">m/km</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Segments Monitored</div>
            <div className="text-3xl">{segments.length}</div>
            <div className="text-xs text-muted-foreground">Total segments</div>
          </CardContent>
        </Card>
        <Card className={alertSegments.length > 0 ? 'border-orange-500' : ''}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Above Threshold</div>
            <div className="text-3xl text-orange-600">{alertSegments.length}</div>
            <div className="text-xs text-muted-foreground">&gt; 3.5 IRI</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Network Length</div>
            <div className="text-3xl">75</div>
            <div className="text-xs text-muted-foreground">km total</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alertSegments.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Roughness Alert</AlertTitle>
          <AlertDescription>
            {alertSegments.length} segments exceed IRI threshold of 3.5 m/km
          </AlertDescription>
        </Alert>
      )}

      {/* IRI by Segment */}
      <Card>
        <CardHeader>
          <CardTitle>International Roughness Index by Segment</CardTitle>
          <CardDescription>Current IRI scores across monitored routes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={segments} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="iri" fill="#3b82f6" name="IRI (m/km)">
                {segments.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.iri > 3.5 ? '#f97316' : entry.iri > 2.5 ? '#eab308' : '#3b82f6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Good (&lt; 2.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span>Fair (2.5-3.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span>Poor (&gt; 3.5)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roughness Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Roughness Heatmap</CardTitle>
          <CardDescription>Spatial distribution of road quality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {segments.map(seg => (
              <div 
                key={seg.id} 
                className={`p-4 rounded-lg border ${
                  seg.iri > 3.5 ? 'bg-orange-100 border-orange-500 dark:bg-orange-950/20' :
                  seg.iri > 2.5 ? 'bg-yellow-100 border-yellow-500 dark:bg-yellow-950/20' :
                  'bg-blue-100 border-blue-500 dark:bg-blue-950/20'
                }`}
              >
                <div className="text-sm mb-2">{seg.name}</div>
                <div className="text-2xl">{seg.iri.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">IRI Score</div>
                <Badge 
                  variant="outline" 
                  className="mt-2"
                >
                  {seg.iri > 3.5 ? 'Poor' : seg.iri > 2.5 ? 'Fair' : 'Good'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IRI Trend Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>IRI Trend Over Time</CardTitle>
          <CardDescription>12-month roughness history for Service Road A</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generateIRITrend('Service Road A')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="iri" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="IRI (m/km)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impact Analysis */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vibration Analysis</CardTitle>
            <CardDescription>Accelerometer data per segment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vibrationData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Max: {item.maxVibration} g
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{item.avgVibration} g</div>
                    <div className="text-xs text-muted-foreground">Avg vibration</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IRI vs Defect Correlation</CardTitle>
            <CardDescription>Relationship between roughness and defects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="iri" fill="#3b82f6" name="IRI" />
                <Bar yAxisId="right" dataKey="defects" fill="#ef4444" name="Defect Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
