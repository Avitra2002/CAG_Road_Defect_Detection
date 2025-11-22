import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Defect, DefectPriority } from '../types';
import { Wrench, Calendar, AlertTriangle } from 'lucide-react';
import { maintenanceApi, MaintenanceTeam } from '../api/maintenance';

interface SendToMaintenanceDialogProps {
  defect: Defect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (defectId: string, teamId: number, priority: DefectPriority, notes?: string) => void;
}

export function SendToMaintenanceDialog({
  defect,
  open,
  onOpenChange,
  onAssign
}: SendToMaintenanceDialogProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [maintenanceTeams, setMaintenanceTeams] = useState<MaintenanceTeam[]>([]);
  const [priority, setPriority] = useState<DefectPriority>('normal');
  const [notes, setNotes] = useState('');

  // Fetch maintenance teams when component mounts
  useEffect(() => {
    maintenanceApi.getTeams().then(setMaintenanceTeams);
  }, []);

  const handleAssign = () => {
    if (!defect || !selectedTeamId) return;

    onAssign(defect.id, selectedTeamId, priority, notes.trim() || undefined);

    // Reset form
    setSelectedTeamId(null);
    setPriority('normal');
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedTeamId(null);
    setPriority('normal');
    setNotes('');
    onOpenChange(false);
  };

  function calculateAge(date: Date | string | undefined): number {
    if (!date) return 0;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // days
  }

  if (!defect) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#E6071F]" />
            Send to Maintenance Team
          </DialogTitle>
          <DialogDescription>
            Assign this approved defect to a maintenance team for repair
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Defect Info */}
          <div className="p-4 bg-[#F5F3F0] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{defect.id}</span>
                <Badge variant={defect.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {defect.severity}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground capitalize">{defect.type}</span>
            </div>
            <p className="text-sm text-muted-foreground">{defect.location}</p>
            <div className="flex gap-4 text-sm">
              <span>Segment: <strong>{defect.segment}</strong></span>
              <span>Age: <strong>{(defect.ageInDays ??calculateAge(defect.detectedAt))} days</strong></span>
              {defect.size && <span>Size: <strong>{defect.size.toFixed(1)} cm</strong></span>}
            </div>
          </div>

          {/* Maintenance Team Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#7D6A55]" />
              Select Maintenance Team
            </Label>
            <Select
              value={selectedTeamId?.toString() || ''}
              onValueChange={(value) => setSelectedTeamId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a maintenance team..." />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTeams.map(team => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#F2790D]" />
              Repair Priority
            </Label>
            <Select value={priority} onValueChange={(value: DefectPriority) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#E6071F]" />
                    Urgent - Immediate Action Required
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F2790D]" />
                    High - Within 24 Hours
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F9B504]" />
                    Normal - Within 72 Hours
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#7D6A55]" />
                    Low - Scheduled Maintenance
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#7D6A55]" />
              Additional Notes (Optional)
            </Label>
            <Textarea
              placeholder="Add any special instructions or notes for the maintenance team..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for Critical Defects */}
          {defect.severity === 'critical' && (
            <div className="flex items-start gap-2 p-3 bg-[#E6071F]/10 border-l-4 border-l-[#E6071F] rounded">
              <AlertTriangle className="h-5 w-5 text-[#E6071F] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#E6071F]">Critical Defect</p>
                <p className="text-sm text-muted-foreground">
                  This defect requires immediate attention. Consider assigning to the Emergency Repair Team.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedTeamId}
            className="bg-[#E6071F] hover:bg-[#C00619]"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Assign to Maintenance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
