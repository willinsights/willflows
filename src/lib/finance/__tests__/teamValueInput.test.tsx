import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeamMemberValueInput } from '@/components/projects/TeamMemberValueInput';

afterEach(cleanup);
describe('team value saving', () => {
  it('saves Sávio cost on blur without adding payment', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TeamMemberValueInput memberId="savio"
      amounts={{ cost_amount: 125, payment_amount: 0 }} disabled={false} onSave={onSave} />);
    const input = screen.getByLabelText('Valor (€)');
    fireEvent.change(input, { target: { value: '130' } });
    fireEvent.blur(input);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('savio', { cost_amount: 130 }));
  });
  it('choosing "Outra pessoa" removes only the payable amount', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TeamMemberValueInput memberId="rafaela"
      amounts={{ cost_amount: 60, payment_amount: 60 }} disabled={false} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Outra pessoa' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('rafaela', { payment_amount: 0 }));
  });
  it('choosing "Estúdio" restores the payable amount to the value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TeamMemberValueInput memberId="rafaela"
      amounts={{ cost_amount: 60, payment_amount: 0 }} disabled={false} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Estúdio' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('rafaela', { payment_amount: 60 }));
  });
});
