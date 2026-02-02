import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, isSameMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MonthPickerProps {
  selectedMonth: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthPicker({ 
  selectedMonth, 
  onPrevious, 
  onNext, 
  onToday 
}: MonthPickerProps) {
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  return (
    <div className="flex items-center gap-1.5">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={onPrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm font-medium min-w-[90px] text-center capitalize">
        {format(selectedMonth, 'MMM yyyy', { locale: pt })}
      </span>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7" 
        onClick={onNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs ml-1" 
          onClick={onToday}
        >
          <CalendarDays className="h-3 w-3 mr-1" />
          Hoje
        </Button>
      )}
    </div>
  );
}
