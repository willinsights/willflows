import type { ReportProjeto, ReportGravacao, ReportDiaria, ReportTrabalho } from '@/hooks/useActivityReport';

const ANO = new Date().getFullYear();

/** Dados de exemplo para pré-visualizar o layout antes de importar do WillFlow. */
export const SAMPLE_PROJETOS: ReportProjeto[] = [
  ['IS-001', 'Milão + Sardenha — Hotel Reel 1', 'Cliente Demo A', 'Vídeo', '01', 3, 480, 120, 0],
  ['IS-002', 'Milão + Sardenha — Hotel Reel 2', 'Cliente Demo A', 'Reel', '02', 2, 320, 90, 0],
  ['IS-003', 'Milão + Sardenha — Experiência', 'Cliente Demo A', 'Foto + Vídeo', '02', 1, 640, 180, 40],
  ['IS-004', 'Cliente Demo B — Hotel Exemplo', 'Cliente Demo B', 'Vídeo', '03', 2, 346, 60, 0],
  ['IS-005', 'Cliente Demo B — Costa Smeralda', 'Cliente Demo B', 'Vídeo', '04', 1, 346, 60, 0],
  ['IS-006', 'Cliente Demo B — Porto Cervo', 'Cliente Demo B', 'Reel', '05', 1, 96, 36, 0],
  ['IS-007', 'Nova Zelândia — Lodge Sul', 'Cliente Demo C', 'Vídeo', '06', 1, 52, 40, 0],
  ['IS-008', 'Nova Zelândia — Queenstown', 'Cliente Demo C', 'Vídeo', '07', 2, 48, 30, 0],
  ['IS-009', 'Nova Zelândia — Fiordland', 'Cliente Demo C', 'Reel', '07', 1, 16, 10, 0],
  ['IS-010', 'Sessão de produto', 'Cliente Demo D', 'Foto', '08', 1, 250, 80, 25],
].map(([codigo, projeto, cliente, tipo, mes, versoes, receita, custoColab, extras], i) => {
  const custo = Number(custoColab) + Number(extras);
  return {
    id: `sample-${i}`,
    codigo: codigo as string,
    projeto: projeto as string,
    cliente: cliente as string,
    tipo: tipo as string,
    data_entrega: `${ANO}-${mes}-15`,
    captacao: i % 2 === 0 ? 'Operador Demo A' : 'Operador Demo B',
    edicao: i % 3 === 0 ? 'Editor Demo A' : i % 3 === 1 ? 'Editor Demo B' : 'Operador Demo B',
    versoes: Number(versoes),
    receita: Number(receita),
    custo_colab: Number(custoColab),
    extras: Number(extras),
    custo,
    lucro: Number(receita) - custo,
    status: i % 5 === 0 ? 'Por receber' : 'Entregue',
    mes: mes as string,
    ano: ANO,
  };
});

export const SAMPLE_GRAVACOES: ReportGravacao[] = [
  {
    id: 'g1',
    data: `${ANO}-03-12`,
    local: 'Milão, Itália',
    cliente: 'Cliente Demo A',
    ponto_encontro: 'Hotel de Demonstração, 08:30',
    producoes: ['Hotel Reel 1', 'Hotel Reel 2'],
    colaboradores: ['Operador Demo A', 'Operador Demo B'],
    ano: ANO,
  },
  {
    id: 'g2',
    data: `${ANO}-04-02`,
    local: 'Sardenha, Itália',
    cliente: 'Cliente Demo B',
    ponto_encontro: 'Hotel Exemplo, 09:00',
    producoes: ['Hotel Exemplo', 'Costa Smeralda'],
    colaboradores: ['Operador Demo A'],
    ano: ANO,
  },
  {
    id: 'g3',
    data: `${ANO}-06-21`,
    local: 'Queenstown, NZ',
    cliente: 'Cliente Demo C',
    ponto_encontro: 'Lodge Sul, 07:45',
    producoes: ['Lodge Sul', 'Fiordland'],
    colaboradores: ['Operador Demo A', 'Editor Demo B'],
    ano: ANO,
  },
];

export const SAMPLE_DIARIAS: ReportDiaria[] = [
  { id: 'd1', data: `${ANO}-01-05`, colaborador: 'Editor Demo A', tipo: 'fixo', valor: 0, notas: 'Editor mensal fixo', ano: ANO },
  { id: 'd2', data: `${ANO}-03-18`, colaborador: 'Operador Demo B', tipo: 'diaria', valor: 120, notas: 'Estúdio — produto', ano: ANO },
  { id: 'd3', data: `${ANO}-07-09`, colaborador: 'Editor Demo B', tipo: 'diaria', valor: 120, notas: 'Estúdio — entrevistas', ano: ANO },
];

export const SAMPLE_TRABALHOS: ReportTrabalho[] = [
  { id: 't1', data: `${ANO}-05-14`, descricao: 'Legendagem multilíngue', cliente: 'Cliente Demo A', valor: 180, ano: ANO },
  { id: 't2', data: `${ANO}-08-02`, descricao: 'Tratamento de cor extra', cliente: 'Cliente Demo B', valor: 90, ano: ANO },
];
