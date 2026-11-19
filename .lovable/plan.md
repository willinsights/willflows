# Verificação só de leitura: backups, exportação, ambiente isolado e versões de funções

## Resultado da verificação (sem alterações)

| Ponto | Consigo ver? | Estado |
|---|---|---|
| Data do último ponto de restauro | Não | Não tenho nenhuma ferramenta que leia a lista de backups. Não indico datas nem contagens. |
| Exportação já preparada | Não confirmado | Só é visível ao proprietário no painel; não alego que existe. |
| Ambiente de teste isolado | Parcial | Existem rascunhos com backend próprio e isolado (função de rascunhos da plataforma), mas nenhum foi criado nem validado para este lote. A outra opção é restaurar uma exportação num projeto separado do proprietário. |
| Versão de `webhook-retry-worker` | Não | A plataforma implanta por nome e não expõe a versão, o SHA nem o código que está a correr. |
| Versão de `cleanup-expired-videos` | Não | Igual: não é verificável. O código no editor não prova o que está implantado. |

## O que o proprietário pode verificar (sem restaurar nada)

1. Backups: More → Database → Manage → Backups. Ler a data UTC mais recente. Não clicar em "Restore to this backup".
2. Exportação: More → Database → Manage → Settings → Export project data, ou procurar um ficheiro de exportação em More → Storage. Se não existir, iniciar uma exige o backend ativo e só é possível uma vez por dia. Não inclui ficheiros de storage, código de funções nem segredos.
3. Funções: em Cloud → Edge Functions, anotar a data da última implantação de cada uma das duas funções, se aparecer.

## Próximo passo após aprovação

Nenhuma alteração. Quando o proprietário me enviar as datas e o estado da exportação, registo-os como evidência operacional na lista de go/no-go. Os passos que aceitam as provas não mudam: backup, artefacto/versão e drenagem.
