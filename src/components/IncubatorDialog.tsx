import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface IncubatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (incubator: string | null) => Promise<void>;
  roomNumber: string;
}

const getIncubatorOptions = (roomNumber: string) => {
  switch (roomNumber) {
    case '24': return ['14', '15'];
    case '30': return ['01', '02', '18'];
    case '31': return ['03', '04', '05', '06'];
    case '32': return ['20', '21', '07', '08'];
    case '33': return ['10', '11', '12', '13'];
    default: return ['1', '2', '3', '4', '5'];
  }
};

export function IncubatorDialog({ open, onOpenChange, onConfirm, roomNumber }: IncubatorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const options = getIncubatorOptions(roomNumber);
  const incubatorOptions = [...options, 'No Incubator'];

  const handleSelect = async (option: string) => {
    setIsSubmitting(true);
    const incubator = option === 'No Incubator' ? null : option;
    await onConfirm(incubator);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-gray-800">
            Select Incubator for Room {roomNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-4">
          {incubatorOptions.map((option) => (
            <Button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={isSubmitting}
              variant="outline"
              className="h-14 text-lg font-medium bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 text-gray-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : option === 'No Incubator' ? (
                'No Incubator'
              ) : (
                `Incubator ${option}`
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
