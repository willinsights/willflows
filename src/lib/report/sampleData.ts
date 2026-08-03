import type { ReportProjeto, ReportGravacao, ReportDiaria, ReportTrabalho } from '@/hooks/useActivityReport';

const ANO = new Date().getFullYear();

/** Dados de exemplo para pré-visualizar o layout antes de importar do WillFlow. */
export const SAMPLE_PROJETOS: ReportProjeto[] = [
  ['IS-001', 'Milão + Sardenha — Hotel Reel 1', 'Tempovip', 'Vídeo', '01', 3, 480, 120, 0],
  ['IS-002', 'Milão + Sardenha — Hotel Reel 2', 'Tempovip', 'Reel', '02', 2, 320, 90, 0],
  ['IS-003', 'Milão + Sardenha — Experiência', 'Tempovip', 'Foto + Vídeo', '02', 1, 640, 180, 40],
  ['IS-004', 'Bliss Travel — Chia Laguna', 'Bliss Travel', 'Vídeo', '03', 2, 346, 60, 0],
  ['IS-005', 'Bliss Travel — Costa Smeralda', 'Bliss Travel', 'Vídeo', '04', 1, 346, 60, 0],
  ['IS-006', 'Bliss Travel — Porto Cervo', 'Bliss Travel', 'Reel', '05', 1, 96, 36, 0],
  ['IS-007', 'Nova Zelândia — Lodge Sul', 'Anzarya', 'Vídeo', '06', 1, 52, 40, 0],
  ['IS-008', 'Nova Zelândia — Queenstown', 'Anzarya', 'Vídeo', '07', 2, 48, 30, 0],
  ['IS-009', 'Nova Zelândia — Fiordland', 'Anzarya', 'Reel', '07', 1, 16, 10, 0],
  ['IS-010', 'Sessão de produto', 'Amazorial', 'Foto', '08', 1, 250, 80, 25],
].map(([codigo, projeto, cliente, tipo, mes, versoes, receita, custoColab, extras], i) => {
  const custo = Number(custoColab) + Number(extras);
  return {
    id: `sample-${i}`,
    codigo: codigo as string,
    projeto: projeto as string,
    cliente: cliente as string,
    tipo: tipo as string,
    data_entrega: `${ANO}-${mes}-15`,
    captacao: i % 2 === 0 ? 'Wilker' : 'Christian',
    edicao: i % 3 === 0 ? 'Savio' : i % 3 === 1 ? 'Morais' : 'Christian',
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
    cliente: 'Tempovip',
    ponto_encontro: 'Hotel Duomo, 08:30',
    producoes: ['Hotel Reel 1', 'Hotel Reel 2'],
    colaboradores: ['Wilker', 'Christian'],
    ano: ANO,
  },
  {
    id: 'g2',
    data: `${ANO}-04-02`,
    local: 'Sardenha, Itália',
    cliente: 'Bliss Travel',
    ponto_encontro: 'Chia Laguna Resort, 09:00',
    producoes: ['Chia Laguna', 'Costa Smeralda'],
    colaboradores: ['Wilker'],
    ano: ANO,
  },
  {
    id: 'g3',
    data: `${ANO}-06-21`,
    local: 'Queenstown, NZ',
    cliente: 'Anzarya',
    ponto_encontro: 'Lodge Sul, 07:45',
    producoes: ['Lodge Sul', 'Fiordland'],
    colaboradores: ['Wilker', 'Morais'],
    ano: ANO,
  },
];

export const SAMPLE_DIARIAS: ReportDiaria[] = [
  { id: 'd1', data: `${ANO}-01-05`, colaborador: 'Savio', tipo: 'fixo', valor: 0, notas: 'Editor mensal fixo', ano: ANO },
  { id: 'd2', data: `${ANO}-03-18`, colaborador: 'Christian', tipo: 'diaria', valor: 120, notas: 'Estúdio — produto', ano: ANO },
  { id: 'd3', data: `${ANO}-07-09`, colaborador: 'Morais', tipo: 'diaria', valor: 120, notas: 'Estúdio — entrevistas', ano: ANO },
];

export const SAMPLE_TRABALHOS: ReportTrabalho[] = [
  { id: 't1', data: `${ANO}-05-14`, descricao: 'Legendagem multilíngue', cliente: 'Tempovip', valor: 180, ano: ANO },
  { id: 't2', data: `${ANO}-08-02`, descricao: 'Tratamento de cor extra', cliente: 'Bliss Travel', valor: 90, ano: ANO },
];
