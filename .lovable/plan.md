
## Tornar o canal "acessos" visível para toda a equipa

### Problema
O canal **#acessos** está configurado como privado e só tem 4 dos 9 membros do workspace.

### Solução (2 passos via base de dados)

**1. Tornar o canal público**
- Actualizar `is_private` de `true` para `false` na tabela `conversations`

**2. Adicionar todos os membros em falta**
- Inserir os 5 membros do workspace que ainda não estão no canal na tabela `conversation_members`
- Isto garante que todos vêem o canal imediatamente, incluindo utilizadores com permissões restritas

### Detalhe técnico

Uma única migração SQL que:
1. Faz `UPDATE conversations SET is_private = false` para o canal "acessos"
2. Faz `INSERT INTO conversation_members` para todos os membros do workspace que ainda não são membros do canal (usando `NOT EXISTS` para evitar duplicados)

Sem alterações de código -- apenas dados na base de dados.
