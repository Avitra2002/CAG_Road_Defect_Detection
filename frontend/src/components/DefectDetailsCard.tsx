import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Defect } from '../types';
import { Dialog, DialogContent, DialogHeader } from "./ui/dialog";
import { 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Ruler, 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Wrench,
  Clock,
  Users,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { ImageWithFallback } from './fallback/ImageWithFallback';


interface DefectDetailsCardProps {
  defect: Defect | null;
  onClose: () => void;
  onChecked?: (defectId: string) => void;
  onFalsePositive?: (defectId: string) => void;
  onEscalate?: (defectId: string) => void;
  onChangeStatus?: (defectId: string) => void;
  onDelete?: (defectId: string) => void;
  onStartRepair?: (defectId: string) => void;
  onSubmitForReview?: (defectId: string) => void;
  onReturnToProgress?: (defectId: string) => void;
  onMarkCompleted?: (defectId: string) => void;
  onShowInMap?: (defectId: string) => void;
  hideCloseButton?: boolean;
}

export function DefectDetailsCard({
  defect,
  onClose,
  onChecked,
  onFalsePositive,
  onEscalate,
  onChangeStatus,
  onDelete,
  onStartRepair,
  onSubmitForReview,
  onReturnToProgress,
  onMarkCompleted,
  onShowInMap,
  hideCloseButton = false
}: DefectDetailsCardProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [, forceUpdate] = useState({});


  if (!defect) {
    return null;
  }
  

  const actualStatus = defect.status;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'for_checking':
      case 'for_review':
        return 'default';
      case 'checked':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'false_positive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'for_checking': 'For Checking',
      'checked': 'Checked',
      'false_positive': 'False +',
      'assigned': 'Assigned',
      'in_progress': 'In Progress',
      'for_review': 'For Review',
      'completed': 'Completed'
    };
    return labels[status] || status;
  };
  const computeAgeInDays = (date: Date) => {
    const dt = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const ageInDays = defect.ageInDays ?? computeAgeInDays(defect.detectedAt);

  return (
    <Card className="p-0 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-[#FAFAF8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#7D6A55]" />
            <h3>Defect Details</h3>
          </div>
          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title="Close (Escape)"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          View and manage defect information
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Defect Image */}
        {defect.images && defect.images.length > 0 ? (
          <div>
            
            <div
              className="aspect-video w-full bg-gray-100 relative cursor-pointer border"
              onClick={() => {
                setSelectedImageIndex(0);
                setImageDialogOpen(true);
              }}
            >
              <ImageWithFallback
                src={defect.images[0].url}
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

            {defect.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-2">
                {defect.images.map((img, idx) => (
                  <ImageWithFallback
                    key={idx}
                    src={img.url}
                    alt={`Thumbnail ${idx}`}
                    className="h-20 w-full object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setImageDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
      </div>

      ) : defect.image ? (

     
      <div
        className="aspect-video w-full bg-gray-100 relative cursor-pointer border"
        onClick={() => setImageDialogOpen(true)}
      >
        <ImageWithFallback
          src={defect.image}
          alt={`Defect ${defect.id}`}
          className="w-full h-full object-cover"
        />
      </div>

      ) : null}


        
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
            <Badge variant={getStatusBadgeVariant(actualStatus)}>
              {getStatusLabel(actualStatus)}
            </Badge>
          </div>
          
          {/* Details Grid */}
          <div className="space-y-3">
           
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Zone</p>
                <p className="text-sm">{defect.zone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Segment</p>
                <p className="text-sm">{defect.segment}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Coordinates</p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                {defect.coordinates.lat.toFixed(6)}, {defect.coordinates.lng.toFixed(6)}
              </p>
            </div>
            
           
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Detected</p>
                  <p className="text-sm">{new Date(defect.detectedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="text-sm">{ageInDays}d</p>
                </div>
              </div>
            </div>
            
            {defect.size && (
              <div className="flex items-start gap-2">
                <Ruler className="h-4 w-4 mt-0.5 text-[#7D6A55] flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="text-sm">{defect.size != null ? defect.size.toFixed(1) : "-"} cm</p>
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
          {(actualStatus === 'assigned' || actualStatus === 'in_progress' || actualStatus === 'for_review') && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">Maintenance Details</p>
              <div className="space-y-2 bg-[#F5F3F0] p-3 rounded">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#7D6A55]" />
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-sm font-medium">{defect.assignedMaintenanceTeamName || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#7D6A55]" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="text-sm">
                      {defect.assignedAt
                        ? defect.assignedAt.toLocaleDateString()
                        : "-"}
                    </p>
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
          )}
          
          {/* Actions */}
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground mb-3">Actions</p>
            <div className="space-y-2">
              {/* Show in Map */}
              {onShowInMap && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => onShowInMap(defect.id)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Show in Map
                </Button>
              )}

              {/* For Checking Status */}
              {actualStatus === 'for_checking' && (
                <>
                  {onChecked && (
                    <Button
                      className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                      onClick={() => onChecked(defect.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Checked
                    </Button>
                  )}
                  {onFalsePositive && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => onFalsePositive(defect.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as False +
                    </Button>
                  )}
                </>
              )}

              {/* Checked Status */}
              {actualStatus === 'checked' && (
                <>
                  {onEscalate && (
                    <Button
                      className="w-full bg-[#E6071F] hover:bg-[#C00619]"
                      onClick={() => onEscalate(defect.id)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Escalate to Maintenance
                    </Button>
                  )}
                  {onChangeStatus && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => onChangeStatus(defect.id)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Change Status
                    </Button>
                  )}
                </>
              )}

              {/* Assigned Status (Maintenance assigned but not started) */}
              {actualStatus === 'assigned' && onStartRepair && (
                <Button
                  className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                  onClick={() => onStartRepair(defect.id)}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Start Repair
                </Button>
              )}

              {/* False Positive Status */}
              {actualStatus === 'false_positive' && (
                <>
                  {onDelete && (
                    <Button
                      className="w-full bg-[#E6071F] hover:bg-[#C00619]"
                      onClick={() => onDelete(defect.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  {onChangeStatus && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => onChangeStatus(defect.id)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Change Status
                    </Button>
                  )}
                </>
              )}



              {/* In Progress Status */}
              {actualStatus === 'in_progress' && onSubmitForReview && (
                <Button
                  className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                  onClick={() => onSubmitForReview(defect.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              )}

              {/* For Review Status */}
              {actualStatus === 'for_review' && (
                <>
                  {onMarkCompleted && (
                    <Button
                      className="w-full bg-[#7D6A55] hover:bg-[#6A5A47]"
                      onClick={() => onMarkCompleted(defect.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}
                  {onReturnToProgress && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => onReturnToProgress(defect.id)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Return to In Progress
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}