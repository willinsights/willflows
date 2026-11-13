# G04/S03 — candidatos defensivos

- Validar no servidor projeto/tarefa/workspace em emissão de upload e processamento; vincular a chave emitida ao usuário e contexto com comprovante assinado pelo servidor.
- Validar versão de substituição e chaves persistidas antes de processamento, assinatura de download ou remoção de ativos.
- Compartilhar validação de escopo dos links em revisão, feedback e download, preservando links existentes coerentes (inclusive tarefa com projeto derivável).
- Preparar SQL e reversão fora das migrações aplicáveis somente se os caminhos de escrita direta exigirem proteção estrutural.
- Executar testes positivos fictícios com rede bloqueada e análise estática; documentar versões ativas disponíveis, arquivos, hashes e ordem de implantação.

## Limites e detalhes técnicos
Nada será aplicado ao banco, implantado ou publicado. Novos uploads exigirão comprovante; links de revisão existentes não serão rotacionados. Metadados ausentes serão reportados como desconhecidos. Não haverá testes exploratórios ou leitura de dados de clientes.