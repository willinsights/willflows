# Review Studio único para vídeos antigos

## Objetivo
Os links de aprovação antigos continuam válidos, mas abrem na interface atual do Review Studio. Não copiar, mover ou apagar ficheiros de vídeo.

## Alterações
- Criar um adaptador entre o formato dos links antigos e o contrato usado pelo Review Studio atual.
- Mostrar versões, reprodução, comparação, aprovação em destaque, comentários com timecode, respostas da equipa, exportação e aviso de retenção.
- Permitir editar/apagar comentários antigos apenas com a chave secreta guardada no mesmo navegador, como no circuito novo.
- Devolver também as respostas da equipa no endpoint público antigo e bloquear comentários/alterações depois da aprovação no servidor.
- Adicionar apenas a data de edição aos comentários antigos; sem migrar ficheiros nem alterar tokens.

## Verificação
- Testes do adaptador, das regras de comentários e do encaminhamento dos links.
- Testes de regressão do Review Studio e compilação automática.
- Validar um link antigo real em leitura no navegador, sem criar aprovações nem apagar conteúdo real.

## Publicação
As três Edge Functions afetadas serão implantadas. A aplicação cliente só ficará atualizada no domínio após publicação separada.
