import { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Wrench,
  Activity,
  MapIcon,
  Users,
  Upload
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/sonner';
import { OverviewPage } from './components/OverviewPage';
import { AlertsPage } from './components/AlertsPage';
import { DefectsPage } from './components/DefectsPage';
import { MaintenancePage } from './components/MaintenancePage';
import { RoadRoughnessPage } from './components/RoadRoughnessPage';
import { RoadCoverageFrequencyPage } from './components/RoadCoverageFrequencyPage';
import { OpsAssignmentPage } from './components/OpsAssignmentPage';
import { UploadPage } from './components/UploadPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [focusedDefectId, setFocusedDefectId] = useState<string | null>(null);

  // const handleShowDefectInMap = (defectId: string) => {
  //   setFocusedDefectId(defectId);
  //   setActiveTab('defects');
  // };

  return (
    <div className="min-h-screen bg-background">

      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#7D6A55]">CAG Airside Road Safety Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time monitoring and analytics for airside operations • 75 km network
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="text-sm font-medium text-[#7D6A55]">
                  {new Date().toLocaleString('en-SG', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short',
                    timeZone: 'Asia/Singapore'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
          <div className="border-b bg-[#FAFAF8] sticky top-[88px] z-40">
            <TabsList className="container mx-auto px-6 h-14 bg-transparent rounded-none border-0 flex justify-start gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="alerts" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#E6071F]"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Alerts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="defects" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <FileText className="h-4 w-4" />
                <span>Defects</span>
              </TabsTrigger>
              <TabsTrigger 
                value="roughness" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <Activity className="h-4 w-4" />
                <span>Roughness</span>
              </TabsTrigger>
              <TabsTrigger 
                value="coverage" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <MapIcon className="h-4 w-4" />
                <span>Coverage</span>
              </TabsTrigger>
              <TabsTrigger 
                value="operations" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <Users className="h-4 w-4" />
                <span>Operations</span>
              </TabsTrigger>
              <TabsTrigger
                value="maintenance"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#F2790D]"
              >
                <Wrench className="h-4 w-4" />
                <span>Maintenance</span>
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#7D6A55] data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#7D6A55]"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <OverviewPage />
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <AlertsPage />
          </TabsContent>

          <TabsContent value="defects" className="mt-0">
            <DefectsPage 
              focusedDefectId={focusedDefectId} 
              onDefectFocused={() => setFocusedDefectId(null)}
            />
          </TabsContent>

          <TabsContent value="roughness" className="mt-0">
            <RoadRoughnessPage />
          </TabsContent>

          <TabsContent value="coverage" className="mt-0">
            <RoadCoverageFrequencyPage />
          </TabsContent>

          <TabsContent value="operations" className="mt-0">
            <OpsAssignmentPage />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-0">
            <MaintenancePage />
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <UploadPage />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 bg-[#FAFAF8]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-[#7D6A55]">CAG Airside Road Safety Monitoring System</p>
              <p className="mt-1">Changi Airport Group © {new Date().getFullYear()}</p>
            </div>
            <div className="text-right">
              <p>75 km Network Coverage</p>
              <p className="mt-1">Real-time Defect Detection & Monitoring</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}