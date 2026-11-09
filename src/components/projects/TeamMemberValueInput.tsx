import { useEffect, useState } from 'react';
import { Save, Loader2, SlidersHorizontal } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getTeamValueState, getTeamValueUpdates, type TeamValueAmounts } from '@/lib/finance/teamValue';

interface Props {
  memberId: string;
  amounts: TeamValueAmounts;
  disabled: boolean;
  onSave: (memberId: string, updates: Partial<TeamValueAmounts>) => Promise<void>;
}

export function TeamMemberValueInput({ memberId, amounts, disabled, onSave }: Props) {
  const [draft, setDraft] = useState(() => getTeamValueState(amounts));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(getTeamValueState(amounts));
  }, [amounts.cost_amount, amounts.payment_amount, dirty]);

  const updates = getTeamValueUpdates(amounts, draft.value, draft.notPaidByMe, draft.separatePayment, draft.payment);
  const changed = Object.keys(updates).length > 0;
  const locked = disabled || saving;
  const save = async () => {
    if (!changed || locked) return;
    setSaving(true);
    try {
      await onSave(memberId, updates);
      setDirty(false);
    } catch {
      // Keep the draft; the parent displays the save error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`value-${memberId}`} className="text-xs text-muted-foreground">Valor (€)</Label>
        <CurrencyInput id={`value-${memberId}`} value={draft.value} disabled={locked}
          className="h-8 w-28" onChange={value => {
            setDirty(true);
            setDraft(prev => ({ ...prev, value: value ?? 0 }));
          }} />
        <div className="flex items-center gap-2">
          <Checkbox id={`not-paid-${memberId}`} checked={draft.notPaidByMe} disabled={locked}
            onCheckedChange={checked => {
              setDirty(true);
              setDraft(prev => ({ ...prev, notPaidByMe: checked === true, separatePayment: false }));
            }} />
          <Label htmlFor={`not-paid-${memberId}`} className="text-xs cursor-pointer">Não pago por mim</Label>
        </div>
      </div>
      {draft.separatePayment && !draft.notPaidByMe && (
        <div className="space-y-1">
          <Label htmlFor={`payment-${memberId}`} className="text-xs text-muted-foreground">Pagamento diferente (€)</Label>
          <CurrencyInput id={`payment-${memberId}`} value={draft.payment} disabled={locked}
            className="h-8 w-28" onChange={payment => {
              setDirty(true);
              setDraft(prev => ({ ...prev, payment: payment ?? 0 }));
            }} />
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || draft.notPaidByMe}
            aria-label="Pagamento diferente" aria-pressed={draft.separatePayment}
            onClick={() => {
              setDirty(true);
              setDraft(prev => ({ ...prev, separatePayment: !prev.separatePayment, payment: prev.separatePayment ? prev.value : prev.payment }));
            }}><SlidersHorizontal className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent>Pagamento diferente do valor</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={locked || !changed}
            aria-label="Salvar valor" onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Salvar valor</TooltipContent>
      </Tooltip>
    </div>
  );
}