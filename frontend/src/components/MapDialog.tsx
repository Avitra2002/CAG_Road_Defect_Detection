import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DefectMap } from './DefectMap';
import { DefectDetailsCard } from './DefectDetailsCard';
import { Defect } from '../types';
import { useState,useEffect } from 'react';
import { defectApi } from "../api/defects";
import { segmentApi } from '../api/segments';

interface MapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defect: Defect | null;
  onChecked?: (defectId: string) => void;
  onFalsePositive?: (defectId: string) => void;
  onEscalate?: (defectId: string) => void;
  onChangeStatus?: (defectId: string) => void;
  onDelete?: (defectId: string) => void;
  onStartRepair?: (defectId: string) => void;
  onSubmitForReview?: (defectId: string) => void;
  onReturnToProgress?: (defectId: string) => void;
  onMarkCompleted?: (defectId: string) => void;
}

export function MapDialog({
  open,
  onOpenChange,
  defect,
  onChecked,
  onFalsePositive,
  onEscalate,
  onChangeStatus,
  onDelete,
  onStartRepair,
  onSubmitForReview,
  onReturnToProgress,
  onMarkCompleted
}: MapDialogProps) {
 const [allDefects, setAllDefects] = useState<Defect[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  
  const [internalSelectedDefect, setInternalSelectedDefect] = useState<Defect | null>(null);

  useEffect(() => {
    (async () => {
      const defects = await defectApi.getAll();
      const segs = await segmentApi.getAll();
      setAllDefects(defects);
      setSegments(segs);
    })();
  }, []);

  
  const selectedDefect = defect || internalSelectedDefect;
  
  const handleDefectClick = (clickedDefect: Defect) => {
    setInternalSelectedDefect(clickedDefect);
  };

  const handleClose = () => {
    setInternalSelectedDefect(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
          aria-describedby={undefined}
          className="!max-w-[95vw] !w-[95vw] p-0 !rounded-lg !block !overflow-hidden"
          style={{ height: '85vh', maxHeight: '85vh' }}
        >
      
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Defect Location Map</DialogTitle>
        </DialogHeader>

        
        <div className="p-4" style={{ height: 'calc(85vh - 73px)' }}>
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <div className="lg:col-span-2 h-full">
              <div className="h-full rounded-lg overflow-hidden border">
                <DefectMap
                  defects={allDefects}
                  segments={segments}
                  onDefectClick={handleDefectClick}
                  highlightCritical={true}
                  hideOverlay={true}
                  externalSelectedDefect={selectedDefect}
                  centerOn={selectedDefect?.coordinates || null}
                />
              </div>
            </div>

            
            <div className="h-full overflow-y-auto">
              {selectedDefect ? (
                <DefectDetailsCard
                  defect={selectedDefect}
                  onClose={() => setInternalSelectedDefect(null)}
                  onChecked={onChecked}
                  onFalsePositive={onFalsePositive}
                  onEscalate={onEscalate}
                  onChangeStatus={onChangeStatus}
                  onDelete={onDelete}
                  onStartRepair={onStartRepair}
                  onSubmitForReview={onSubmitForReview}
                  onReturnToProgress={onReturnToProgress}
                  onMarkCompleted={onMarkCompleted}
                  hideCloseButton={true}
                />
              ) : (
                <div className="h-full flex items-center justify-center border rounded-lg bg-[#FAFAF8]">
                  <div className="text-center p-6">
                    <p className="text-sm text-muted-foreground">
                      Click on a defect marker to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
