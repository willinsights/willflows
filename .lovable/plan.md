# Capacidades operacionais para fechar os PRs #1 e #2 (só verificação)

## O que posso executar nesta sessão

| Necessidade | Posso executar? | Detalhe |
|---|---|---|
| Criar uma credencial aleatória só para `webhook-retry-worker` nos segredos das funções, sem mostrar o valor | Sim | A ferramenta de gerar segredos cria e guarda um valor aleatório que nunca é mostrado. Só aceita nomes novos e não substitui um segredo existente. |
| Pôr o mesmo valor também no Vault da base de dados | Não, de forma segura | Não tenho nenhuma ferramenta que copie um segredo das funções para o Vault. Para o fazer, o valor teria de aparecer numa instrução SQL, o que o exporia. Gerar um segundo valor diretamente na base de dados dá uma credencial diferente, que não coincide com a primeira. |
| Destino privado e separado para restaurar a exportação | Não | Não consigo restaurar uma exportação num projeto separado; isso tem de ser feito por ti, num projeto teu. Consigo criar um rascunho com backend próprio, mas começa vazio, sem os dados da exportação. |
| R2 e Stream exclusivos de teste | Não | Não tenho forma de criar contas, buckets ou credenciais da Cloudflare. Seria necessário que tu os criasses e guardasses as credenciais em Project Settings → Secrets. |

## Consequência para os PRs

- PR com credencial do worker: falta uma forma suportada de partilhar o mesmo valor entre as funções e o Vault. Alternativa sem exposição: a função passa a validar uma credencial gerida que a própria plataforma já fornece aos agendamentos, em vez do Vault. Esta alternativa exige outra aprovação.
- PR com teste de restauro/vídeo: depende de um destino e de credenciais de teste fornecidos pelo proprietário.

## Nesta etapa
Não faço nada: não edito ficheiros, não implanto, não gero segredos nem leio valores.
