import { Camera, Film } from 'lucide-react';

export const priorityOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
];

export const typeOptions = [
  { value: 'fotografia', label: 'Fotografia', icon: Camera },
  { value: 'video', label: 'Vídeo', icon: Film },
  { value: 'foto_video', label: 'Foto + Vídeo', icon: Camera },
];

export const categoryOptions = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'experiencia', label: 'Experiência' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
];

export const itemTypeLabels: Record<string, string> = {
  projeto_captacao: 'Projeto de Captação',
  projeto_edicao: 'Projeto de Edição',
  projeto_completo: 'Captação + Edição',
  reuniao: 'Tarefa',
};

export const itemTypeOptions = [
  { value: 'projeto_captacao', label: 'Projeto de Captação' },
  { value: 'projeto_edicao', label: 'Projeto de Edição' },
  { value: 'projeto_completo', label: 'Captação + Edição' },
  { value: 'reuniao', label: 'Tarefa' },
];
