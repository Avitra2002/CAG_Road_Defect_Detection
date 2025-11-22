import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { OpsAssignment } from '../types';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // currentStatus: OpsAssignment['status'];
  currentStatus: string;
  onStatusChange: (newStatus: OpsAssignment['status']) => void;
}

export function ChangeStatusDialog({ 
  open, 
  onOpenChange, 
  currentStatus,
  onStatusChange 
}: ChangeStatusDialogProps) {
  const getAvailableStatuses = () => {
    if (currentStatus === 'checked') {
      return [
        { value: 'false_positive' as const, label: 'False +' },
        { value: 'for_checking' as const, label: 'For Checking' },
      ];
    }
    if (currentStatus === 'false_positive') {
      return [
        { value: 'checked' as const, label: 'Checked' },
        { value: 'for_checking' as const, label: 'For Checking' },
      ];
    }
    return [];
  };

  const statuses = getAvailableStatuses();

  const handleStatusSelect = (status: OpsAssignment['status']) => {
    onStatusChange(status);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Select a new status for this assignment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {statuses.map(status => (
            <Button
              key={status.value}
              onClick={() => handleStatusSelect(status.value)}
              variant="outline"
              className="w-full justify-start"
            >
              {status.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
