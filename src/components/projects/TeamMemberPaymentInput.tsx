import { useState, useEffect, useCallback } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMemberPaymentInputProps {
  memberId: string;
  initialAmount: number | null;
  suggestedAmount: number;
  isManuallyEdited: boolean;
  disabled: boolean;
  onSave: (memberId: string, amount: number) => Promise<void>;
}

export function TeamMemberPaymentInput({
  memberId,
  initialAmount,
  suggestedAmount,
  isManuallyEdited,
  disabled,
  onSave,
}: TeamMemberPaymentInputProps) {
  // Local draft state - starts with server value
  const [draftValue, setDraftValue] = useState<number | null>(initialAmount);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync with server value when it changes externally
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftValue(initialAmount);
    }
  }, [initialAmount, hasUnsavedChanges]);

  // Handle local change (no API call)
  const handleChange = useCallback((value: number | null) => {
    setDraftValue(value);
    // Check if different from server value
    const serverValue = initialAmount || 0;
    const newValue = value || 0;
    setHasUnsavedChanges(Math.abs(serverValue - newValue) > 0.001);
  }, [initialAmount]);

  // Save to server (on blur or Enter)
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(memberId, draftValue || 0);
      setHasUnsavedChanges(false);
    } catch (error) {
      // On error, keep the unsaved state so user can retry
      console.error('Failed to save payment amount:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, isSaving, memberId, draftValue, onSave]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  // Reset to suggested amount
  const handleReset = useCallback(async () => {
    if (suggestedAmount <= 0 || isSaving) return;
    
    setDraftValue(suggestedAmount);
    setHasUnsavedChanges(false);
    setIsSaving(true);
    
    try {
      await onSave(memberId, suggestedAmount);
    } catch (error) {
      console.error('Failed to reset payment amount:', error);
    } finally {
      setIsSaving(false);
    }
  }, [suggestedAmount, isSaving, memberId, onSave]);

  const showResetButton = isManuallyEdited && suggestedAmount > 0;

  return (
    <div className="relative w-24">
      <CurrencyInput
        placeholder="€0.00"
        value={draftValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-8 text-sm",
          showResetButton && "pr-7",
          hasUnsavedChanges && "border-warning ring-1 ring-warning/30"
        )}
        disabled={disabled || isSaving}
      />
      
      {/* Unsaved indicator */}
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Reset button */}
      {showResetButton && !isSaving && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-7 p-0"
              onClick={handleReset}
              disabled={disabled || isSaving}
            >
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Restaurar valor automático (€{suggestedAmount.toFixed(2)})
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
