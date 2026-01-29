
# Plano de Melhorias: Link, UI e Compressão de Vídeo

## Resumo dos Problemas

1. **Link de aprovação com domínio errado** — O link mostra `lovableproject.com` em vez de `willflow.app`
2. **Nome do ficheiro a sair do card** — O texto longo não está a truncar nem a quebrar linha
3. **Compressão de vídeo server-side** — Atualmente os vídeos são enviados sem compressão

---

## 1. Corrigir URL do Link de Aprovação

**Problema atual:**  
O hook `useVideoApproval.ts` usa `window.location.origin` para gerar o link:
```ts
const getApprovalUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/video-approval/${token}`;
};
```
Isto funciona bem em produção, mas na preview mostra o domínio da preview (lovableproject.com).

**Solução:**  
Usar a **URL publicada** (`willflow.app`) como domínio fixo para os links de aprovação, garantindo que clientes sempre recebem o link correto.

**Ficheiro a editar:**
- `src/hooks/useVideoApproval.ts`

**Alteração:**
```ts
const getApprovalUrl = (token: string): string => {
  // Usar sempre o domínio de produção para links de aprovação
  const productionUrl = 'https://willflow.app';
  return `${productionUrl}/video-approval/${token}`;
};
```

---

## 2. Corrigir Overflow do Nome do Ficheiro

**Problema atual:**  
No componente `VideoVersionsList.tsx`, o nome do ficheiro usa apenas `truncate` mas o container não tem largura máxima definida:
```tsx
<p className="font-medium truncate">{version.file_name}</p>
```

**Solução:**  
Adicionar constraints de largura e garantir quebra de texto adequada.

**Ficheiro a editar:**
- `src/components/video-production/VideoVersionsList.tsx`

**Alteração:**
```tsx
<div className="min-w-0 flex-1">
  <p className="font-medium text-sm break-all line-clamp-1" title={version.file_name}>
    {version.file_name}
  </p>
  ...
</div>
```

- `min-w-0 flex-1` — Garante que o elemento pode encolher
- `break-all` — Permite quebrar strings longas sem espaços
- `line-clamp-1` — Limita a 1 linha com ellipsis
- `title` — Mostra o nome completo ao passar o rato

---

## 3. Compressão de Vídeo Server-Side

Esta é a funcionalidade mais complexa. Vou apresentar duas opções:

### Opção A: Sem Compressão (Limitação Técnica)

**Realidade técnica:** Edge Functions do Supabase/Deno têm limitações severas:
- Timeout máximo de 60 segundos
- Memória limitada (não suporta FFmpeg nativo)
- Sem acesso a binários do sistema

Para compressão real de vídeo (FFmpeg), seria necessário:
- Um servidor dedicado (AWS Lambda com layers ou EC2)
- Serviço externo (Cloudflare Stream, Mux, AWS MediaConvert)

### Opção B: Compressão no Cliente (Recomendada para MVP)

Usar a biblioteca `@ffmpeg/ffmpeg` (WebAssembly) para comprimir no browser antes do upload.

**Vantagens:**
- Funciona sem infraestrutura adicional
- Reduz uso de storage
- O utilizador vê progresso

**Desvantagens:**
- Mais lento (depende do dispositivo do utilizador)
- Não funciona em dispositivos muito antigos

**Implementação:**

1. **Instalar dependência:**
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

2. **Criar hook de compressão:**
```text
src/hooks/useVideoCompression.ts
```

```ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useVideoCompression() {
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  
  const compressVideo = async (file: File): Promise<File> => {
    const ffmpeg = new FFmpeg();
    
    // Carregar FFmpeg WASM
    await ffmpeg.load({
      coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
    });
    
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });
    
    // Escrever ficheiro de input
    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Comprimir (CRF 28 = boa qualidade com boa compressão)
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);
    
    // Ler resultado
    const data = await ffmpeg.readFile('output.mp4');
    return new File([data], file.name, { type: 'video/mp4' });
  };
  
  return { compressVideo, progress, compressing };
}
```

3. **Integrar no upload (`VideoUploader.tsx`):**
- Adicionar checkbox "Comprimir vídeo antes de enviar"
- Mostrar barra de progresso da compressão
- Chamar `compressVideo()` antes do upload

### Recomendação

Para o MVP, **implementar a Opção B (compressão no cliente)**. É uma solução funcional que não requer infraestrutura adicional. No futuro, se necessário, pode-se migrar para um serviço de processamento de vídeo dedicado.

---

## Resumo de Ficheiros a Editar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useVideoApproval.ts` | Usar domínio fixo `willflow.app` |
| `src/components/video-production/VideoVersionsList.tsx` | Corrigir overflow do nome |
| `src/hooks/useVideoCompression.ts` | **Novo** — Hook de compressão |
| `src/components/video-production/VideoUploader.tsx` | Integrar compressão |
| `package.json` | Adicionar `@ffmpeg/ffmpeg` |

---

## Notas Técnicas

**Compressão WebAssembly:**
- O ficheiro `ffmpeg-core.wasm` (~31MB) é carregado apenas quando o utilizador opta por comprimir
- A compressão de um vídeo de 100MB leva ~1-3 minutos dependendo do dispositivo
- Fallback: se a compressão falhar, enviar o ficheiro original

**Domínio do link:**
- A alteração usa o domínio de produção fixo para garantir que os links funcionam sempre
- Se o projeto mudar de domínio, basta atualizar uma linha de código
