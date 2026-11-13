# Backup antes da S01 — resultado da verificação (só leitura)

## Resposta
- Não existe snapshot manual guardado na plataforma. Os backups da base de dados são automáticos (1 por dia, cerca de 14 dias). Em More → Database → Manage → Backups só é possível restaurar um backup diário da lista.
- Fonte: documentação oficial "Back up, restore, and export your project's database" (docs.lovable.dev/features/database-backups).

## Alternativa oficial (executada pelo proprietário)
1. More → Database → Manage → Settings → Export project data → Export data.
2. No cartão Database: Export → Start export (1 por 24 h; até 15 GB; o backend tem de estar ativo).
3. Descarregar a partir do link enviado por email ou em More → Storage.
- Inclui estrutura, dados e contas com hashes de password.
- Não inclui ficheiros de Storage, código das funções, segredos nem configurações de login.
- É uma cópia separada, não um ponto de restauro: só pode ser restaurada num projeto separado.

## Condição para a S01
- Ponto de restauro: o snapshot diário mais recente (13/11/2026, 03:33:59 UTC). Dados alterados depois dessa hora não ficam protegidos por ele.
- Recomendação: fazer o export imediatamente antes da janela e aplicar a S01 logo a seguir, sem escritas relevantes entretanto.

Nenhum SQL, export, restauro, alteração de código ou publicação foi feito.
