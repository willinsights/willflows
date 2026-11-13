import { useState, useMemo } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CompetenceMonthSelectProps {
  projectId: string;
  currentValue: string | null;
  deliveredAt: string | null;
}

export function CompetenceMonthSelect({ projectId, currentValue, deliveredAt }: CompetenceMonthSelectProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ competence_month: actualValue })
        .eq('id', projectId)
        .select('competence_month')
        .maybeSingle();
      if (error || !data) {
        toast.error('Não foi possível atualizar o mês de competência.');
        return;
      }
      setValue(data.competence_month);
    } catch {
      toast.error('Não foi possível atualizar o mês de competência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={value || 'default'} onValueChange={handleChange} disabled={saving}>
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
