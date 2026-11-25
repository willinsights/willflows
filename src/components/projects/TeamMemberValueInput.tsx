import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getTeamValueState, getTeamValueUpdates, type TeamValueAmounts } from '@/lib/finance/teamValue';

interface Props {
  memberId: string;
  amounts: TeamValueAmounts;
  disabled: boolean;
  onSave: (memberId: string, updates: Partial<TeamValueAmounts>) => Promise<void>;
}

type Draft = ReturnType<typeof getTeamValueState>;

export function TeamMemberValueInput({ memberId, amounts, disabled, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(() => getTeamValueState(amounts));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(() => getTeamValueState(amounts).separatePayment);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!dirty) setDraft(getTeamValueState(amounts));
  }, [amounts.cost_amount, amounts.payment_amount, dirty]);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const locked = disabled || saving;

  const save = async (next: Draft) => {
    const updates = getTeamValueUpdates(amounts, next.value, next.notPaidByMe, next.separatePayment, next.payment);
    if (Object.keys(updates).length === 0 || disabled) { setDirty(false); return; }
    setSaving(true);
    try {
      await onSave(memberId, updates);
      setDirty(false);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1800);
    } catch {
      // Keep the draft; the parent displays the save error.
    } finally {
      setSaving(false);
    }
  };

  const change = (patch: Partial<Draft>, immediate = false) => {
    setDirty(true);
    const next = { ...draft, ...patch };
    setDraft(next);
    if (immediate) void save(next);
  };

  const payer = draft.notPaidByMe ? 'other' : 'studio';

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`value-${memberId}`} className="text-xs text-muted-foreground">Valor (€)</Label>
          <CurrencyInput id={`value-${memberId}`} value={draft.value} disabled={locked}
            className="h-9 w-28"
            onChange={value => change({ value: value ?? 0 })}
            onBlur={() => dirty && void save(draft)} />
        </div>
        <div className="space-y-1">
          <span id={`payer-${memberId}`} className="block text-xs text-muted-foreground">Quem paga?</span>
          <div role="radiogroup" aria-labelledby={`payer-${memberId}`}
            className="inline-flex h-9 rounded-md border border-border bg-muted/40 p-0.5">
            {([['studio', 'Estúdio'], ['other', 'Outra pessoa']] as const).map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={payer === key} disabled={locked}
                onClick={() => payer !== key && change({ notPaidByMe: key === 'other', separatePayment: false }, true)}
                className={cn(
                  'px-3 text-xs rounded-[5px] transition-colors disabled:opacity-50',
                  payer === key ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="h-9 flex items-center w-4" aria-live="polite">
          {saving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="A gravar" />
            : saved ? <Check className="h-4 w-4 text-success" aria-label="Gravado" /> : null}
        </span>
      </div>

      {draft.notPaidByMe ? (
        <p className="text-xs text-muted-foreground">Conta como custo do projeto, mas não entra em «a pagar».</p>
      ) : showMore || draft.separatePayment ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor={`payment-${memberId}`} className="text-xs text-muted-foreground">Valor a pagar, se for diferente (€)</Label>
            <CurrencyInput id={`payment-${memberId}`} value={draft.separatePayment ? draft.payment : draft.value}
              disabled={locked} className="h-9 w-28"
              onChange={payment => change({ separatePayment: true, payment: payment ?? 0 })}
              onBlur={() => dirty && void save(draft)} />
          </div>
          <button type="button" disabled={locked} className="text-xs text-muted-foreground underline-offset-2 hover:underline h-9"
            onClick={() => { setShowMore(false); if (draft.separatePayment) change({ separatePayment: false }, true); }}>
            Usar o mesmo valor
          </button>
        </div>
      ) : (
        <button type="button" disabled={locked} onClick={() => setShowMore(true)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground">
          Mais opções
        </button>
      )}
    </div>
  );
}
