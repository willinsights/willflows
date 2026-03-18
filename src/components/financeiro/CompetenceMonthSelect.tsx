import { useState, useMemo } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface CompetenceMonthSelectProps {
  projectId: string;
  currentValue: string | null;
  deliveredAt: string | null;
}

export function CompetenceMonthSelect({ projectId, currentValue, deliveredAt }: CompetenceMonthSelectProps) {
  const [value, setValue] = useState(currentValue);
  const displayDefault = deliveredAt ? format(new Date(deliveredAt), 'MMM yy', { locale: pt }) : '-';

  const options = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      const val = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yyyy', { locale: pt });
      result.push({ value: val, label });
    }
    return result;
  }, []);

  const handleChange = async (newValue: string) => {
    const actualValue = newValue === 'default' ? null : newValue;
    setValue(actualValue);
    await supabase.from('projects').update({ competence_month: actualValue }).eq('id', projectId);
  };

  return (
    <Select value={value || 'default'} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-[110px] text-xs">
        <SelectValue>
          {value ? format(parseISO(value + '-01'), 'MMM yy', { locale: pt }) : <span className="text-muted-foreground">{displayDefault}</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">
          <span className="text-muted-foreground">Auto ({displayDefault})</span>
        </SelectItem>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
