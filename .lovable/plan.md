

# PDF Relatório Completo -- Rafaela Nunes (Março 2026)

## Dados extraídos

**22 projetos** desde março 2026, total **€1.070,00**:
- **Entregues**: 16 projetos (10 pendentes = €360, 6 pagos = €590)
- **Em progresso**: 6 projetos (€120 pendentes -- fases Correções, Pós-Produção, Em espera)

## Estrutura do PDF

1. **Cabeçalho** -- Logo WillFlow, título "Relatório de Colaborador", nome Rafaela Nunes, período
2. **Resumo Geral** -- Cards com: Total projetos, Valor total, Pendente, Pago, % pago
3. **Tabela: Projetos Entregues** (16 linhas) -- Projeto, Cliente, Valor, Status Pagamento, Data Entrega, Equipa
4. **Tabela: Projetos Em Progresso** (6 linhas) -- Projeto, Cliente, Valor, Fase Atual, Equipa
5. **Rodapé** -- Marca WillFlow + data de geração

## Implementação

Script Python com `reportlab` executado via `code--exec`:
- Consulta dados já extraídos (hardcoded no script a partir da query)
- Gera PDF formatado com cores WillFlow (#8224e3)
- Status pago em verde, pendente em vermelho
- Salva em `/mnt/documents/relatorio-rafaela-nunes-marco-2026.pdf`
- QA visual obrigatório com `pdftoppm`

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `/tmp/gen_rafaela.py` | Script temporário |
| `/mnt/documents/relatorio-rafaela-nunes-marco-2026.pdf` | PDF final |

