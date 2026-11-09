export interface TeamValueAmounts {
  cost_amount: number | null;
  payment_amount: number | null;
}

export function getTeamValueState(amounts: TeamValueAmounts) {
  const value = amounts.cost_amount ?? amounts.payment_amount ?? 0;
  const payment = amounts.payment_amount ?? 0;
  return {
    value,
    notPaidByMe: value > 0 && payment === 0,
    separatePayment: payment > 0 && payment !== value,
    payment,
  };
}

// Only write changed amounts: opening/saving must not backfill intentional nulls.
export function getTeamValueUpdates(
  original: TeamValueAmounts,
  value: number,
  notPaidByMe: boolean,
  separatePayment: boolean,
  payment: number,
): Partial<TeamValueAmounts> {
  const updates: Partial<TeamValueAmounts> = {};
  const nextPayment = notPaidByMe ? 0 : separatePayment ? payment : value;
  if (value !== (original.cost_amount ?? original.payment_amount ?? 0)) {
    updates.cost_amount = value;
  } else if (original.cost_amount === null && nextPayment !== (original.payment_amount ?? 0)) {
    // Freeze the fallback cost before changing payment alone.
    updates.cost_amount = value;
  }
  if (nextPayment !== (original.payment_amount ?? 0)) updates.payment_amount = nextPayment;
  return updates;
}