import { KanbanBoard } from '@/components/kanban/KanbanBoard';

export default function Edicao() {
  return (
    <KanbanBoard
      phase="edicao"
      title="Edição"
      description="Acompanhe o progresso da pós-produção"
    />
  );
}
