
# Renomear "Producao" para "Review Studio" e Adicionar Download pos-aprovacao

## 1. Renomear tab "Producao" para "Review Studio"

Alterar o nome da tab em todos os locais onde aparece como "Producao" no contexto de video/aprovacao:

| Ficheiro | Linha | Antes | Depois |
|----------|-------|-------|--------|
| `src/components/projects/ProjectDetailsSheet.tsx` | 613 | `Produção` | `Review Studio` |
| `src/components/projects/ProjectDetailsModal.tsx` | 619 | `Produção` | `Review Studio` |
| `src/components/tasks/TaskModal.tsx` | 261 | `Produção` | `Review Studio` |
| `src/components/projects/ProjectDetailsSheet.tsx` | 709 | mensagem de plano | Atualizar texto |
| `src/components/projects/ProjectDetailsModal.tsx` | 1252 | mensagem de plano | Atualizar texto |

**Nota:** Os menus laterais ("PRODUCAO" no sidebar e mobile nav) referem-se a secao de producao geral (Captacao/Edicao), nao ao tab de video, por isso nao serao alterados.

## 2. Pagina de aprovacao do cliente: pos-aprovacao com aviso de retencao e download

No ficheiro `src/pages/public/VideoApproval.tsx`, na secao que renderiza o estado "aprovado" (linhas 592-636), adicionar:

- Aviso informativo de que o video sera eliminado automaticamente apos 7 dias
- Botao de download da versao aprovada utilizando o hook `useVideoDownload` (que ja suporta `approvalToken`)

O resultado visual sera:

```
[check icon] Video Aprovado!
Este video foi aprovado por [nome]

Projeto: ...
Versao: V1
Aprovado em: ...

[icone alerta] Retencao de ficheiros
Este video sera automaticamente eliminado 7 dias apos a aprovacao.
Recomendamos que faca o download agora.

[botao] Descarregar versao aprovada
```

### Detalhes tecnicos

- Importar `Download, AlertTriangle` do lucide-react
- Importar `useVideoDownload` de `@/hooks/useVideoDownload`
- Usar `useVideoDownload({ approvalToken: token })` para autenticar o download publico
- Identificar o `videoVersionId` da versao aprovada a partir de `data.approval.version_number` cruzado com `data.versions`
- O botao tera estado de loading enquanto o download e preparado (status 202)
