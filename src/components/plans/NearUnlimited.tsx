/** "Até 999" com balão "quase ilimitado" para limites de plano altos. */
export function NearUnlimited() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>Até 999</span>
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
        quase ilimitado
      </span>
    </span>
  );
}

export function renderPlanLimit(value: string) {
  return value === 'Até 999' ? <NearUnlimited /> : value;
}
