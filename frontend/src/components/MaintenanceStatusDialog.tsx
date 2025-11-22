import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { MaintenanceActivity, Defect } from '../types';
import { Clock, CheckCircle2, Play, AlertTriangle, RotateCcw, X, Users, Calendar, Ruler } from 'lucide-react';
import { ImageWithFallback } from './fallback/ImageWithFallback';

interface MaintenanceStatusDialogProps {
  defect: Defect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (activityId: string, newStatus: MaintenanceActivity['status'], notes?: string) => void;
}

export function MaintenanceStatusDialog({  
  defect,
  open, 
  onOpenChange, 
  onUpdateStatus 
}: MaintenanceStatusDialogProps) {
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);

  const handleUpdateStatus = (newStatus: MaintenanceActivity['status']) => {
    if (!defect) return;
    onUpdateStatus(defect.id, newStatus, undefined);
    onOpenChange(false);
  };

  const handleMarkAsCompleted = () => {
    setShowConfirmComplete(true);
  };

  const confirmComplete = () => {
    setShowConfirmComplete(false);
    handleUpdateStatus('completed');
  };
  function calculateAge(date: Date | string | undefined): number {
    if (!date) return 0;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // days
  }

  if (!defect || !defect) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Maintenance Task Details - {defect.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Manage maintenance defect status for {defect.type} defect
          </DialogDescription>
          <Card className="p-0 overflow-hidden h-full flex flex-col">
           
            <div className="p-4 border-b bg-[#FAFAF8]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#7D6A55]" />
                  <h3>Maintenance Task Details</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Close (Escape)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manage maintenance defect status
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Defect Image */}
              {defect.image && (
                <div className="aspect-video w-full bg-gray-100 relative border">
                  <ImageWithFallback 
                    src={defect.image}
                    alt={`Defect ${defect.id}`}
                    className="w-full h-full object-cover"
                  />
                  {defect.isWorsening && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Worsening
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 space-y-4">
               
                <div className="border-l-4 border-l-[#7D6A55] pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[#7D6A55]">{defect.id}</h2>
                    <Badge 
                      variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="uppercase"
                    >
                      {defect.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground capitalize">
                    {defect.type} defect
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Status:</p>
                  <Badge variant="default">
                    {defect.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {/* Details Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Zone</p>
                      <p className="text-sm">{defect.zone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Segment</p>
                      <p className="text-sm">{defect.segment}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="text-sm">{(defect.ageInDays ??calculateAge(defect.detectedAt))}d</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Coordinates</p>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                      {defect.coordinates.lat.toFixed(6)}, {defect.coordinates.lng.toFixed(6)}
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Detected</p>
                      <p className="text-sm">{defect.detectedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {defect.size && (
                    <div className="flex items-start gap-2">
                      <Ruler className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="text-sm">{defect.size.toFixed(1)} cm</p>
                      </div>
                    </div>
                  )}
                  
                  {defect.isWorsening && defect.worseningData && (
                    <div className="border-l-4 border-l-[#E6071F] bg-[#E6071F]/5 p-3 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Worsening Trend</p>
                      <p className="text-sm">
                        Size increased from {defect.worseningData.previousSize.toFixed(1)} cm 
                        to {defect.worseningData.currentSize.toFixed(1)} cm
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check date: {defect.worseningData.checkDate.toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Maintenance Team Information */}
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-3">Maintenance Details</p>
                  <div className="space-y-2 bg-[#F5F3F0] p-3 rounded">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#7D6A55]" />
                      <div>
                        <p className="text-xs text-muted-foreground">Team</p>
                        <p className="text-sm font-medium">{defect.assignedMaintenanceTeamName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#7D6A55]" />
                      <div>
                        <p className="text-xs text-muted-foreground">Assigned</p>
                        <p className="text-sm">{defect.assignedAt?.toLocaleDateString() ?? "-"}</p>
                      </div>
                    </div>
                    {defect.startedAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#7D6A55]" />
                        <div>
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p className="text-sm">{defect.startedAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <Badge className={`capitalize ${
                        defect.priority === 'urgent' ? 'bg-[#E6071F]' :
                        defect.priority === 'high' ? 'bg-[#F2790D]' :
                        defect.priority === 'normal' ? 'bg-[#F9B504] text-gray-900' :
                        'bg-[#7D6A55]'
                      }`}>
                        {defect.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Actions</p>
                  <div className="space-y-2">
                    {/* Assigned Status */}
                    {defect.status === 'assigned' && (
                      <Button
                        className="w-full bg-[#F2790D] hover:bg-[#E06808]"
                        onClick={() => handleUpdateStatus('in_progress')}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Repair
                      </Button>
                    )}

                    {/* In Progress Status */}
                    {defect.status === 'in_progress' && (
                      <Button
                        className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                        onClick={() => handleUpdateStatus('for_review')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Submit for Review
                      </Button>
                    )}

                    {/* For Review Status */}
                    {defect.status === 'for_review' && (
                      <>
                        <Button
                          className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                          onClick={handleMarkAsCompleted}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleUpdateStatus('in_progress')}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Return to In Progress
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Marking as Completed */}
      <AlertDialog open={showConfirmComplete} onOpenChange={setShowConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this maintenance defect as completed? 
              This will move it to Past Maintenance Activities and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmComplete}
              className="bg-[#7D6A55] hover:bg-[#705E4E]"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
