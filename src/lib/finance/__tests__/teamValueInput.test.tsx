import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TeamMemberValueInput } from '@/components/projects/TeamMemberValueInput';

afterEach(cleanup);
describe('team value saving', () => {
  it('saves Sávio cost without adding payment or changing payment status', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><TeamMemberValueInput memberId="savio"
      amounts={{ cost_amount: 125, payment_amount: 0 }} disabled={false} onSave={onSave} /></TooltipProvider>);
    fireEvent.change(screen.getByLabelText('Valor (€)'), { target: { value: '130' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar valor' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('savio', { cost_amount: 130 }));
  });
  it('saving not paid by me removes only the payable amount', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><TeamMemberValueInput memberId="rafaela"
      amounts={{ cost_amount: 60, payment_amount: 60 }} disabled={false} onSave={onSave} /></TooltipProvider>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Não pago por mim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar valor' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('rafaela', { payment_amount: 0 }));
  });
});