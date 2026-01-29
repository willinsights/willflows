

# Plano de Correção: AWS SDK Incompatível com Deno

## Problema Identificado

A Edge Function `r2-upload-url` está a falhar porque o **AWS SDK para JavaScript** (`@aws-sdk/client-s3`) **não é compatível com Deno Edge Functions**.

**Erro nos logs:**
```
Error: [unenv] fs.readFile is not implemented yet!
```

O SDK tenta aceder ao sistema de ficheiros (fs) que não existe no runtime Deno das Edge Functions.

---

## Solução: Usar `aws4fetch` + Geração Manual de Presigned URL

A biblioteca `aws4fetch` é leve e compatível com Deno/Workers. Vamos:

1. Remover `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`
2. Usar `aws4fetch` para autenticação AWS Signature V4
3. Gerar presigned URL manualmente

---

## Alterações na Edge Function

**Ficheiro:** `supabase/functions/r2-upload-url/index.ts`

### Antes (incompatível):
```typescript
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.709.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.709.0";

const s3Client = new S3Client({...});
const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
```

### Depois (compatível com Deno):
```typescript
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18";

// Função para gerar presigned URL manualmente
async function generatePresignedUrl(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = new URL(`/${bucket}/${key}`, endpoint);
  
  // Adicionar parâmetros de query para presigned URL
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set('X-Amz-Credential', 
    `${accessKeyId}/${dateStamp}/auto/s3/aws4_request`);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));
  url.searchParams.set('X-Amz-SignedHeaders', 'content-type;host');
  
  // Criar AWS client e assinar
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  
  // Gerar request assinado
  const signedRequest = await client.sign(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    aws: {
      signQuery: true,
      allHeaders: true,
    }
  });
  
  return signedRequest.url;
}
```

---

## Código Completo Actualizado

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};

async function generateR2PresignedUrl(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  
  // AWS4 Signature V4 query parameters
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set('X-Amz-Credential', `${accessKeyId}/${dateStamp}/auto/s3/aws4_request`);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));
  url.searchParams.set('X-Amz-SignedHeaders', 'host');

  const signed = await r2.sign(url.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    aws: { signQuery: true },
  });

  return signed.url;
}

serve(async (req) => {
  // ... código existente de autenticação e validação ...

  // Substituir a parte da geração de URL:
  const presignedUrl = await generateR2PresignedUrl(
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    uniqueKey,
    mimeType || "video/mp4",
    3600
  );

  return new Response(JSON.stringify({
    uploadUrl: presignedUrl,
    key: uniqueKey,
    // ...
  }), { ... });
});
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/r2-upload-url/index.ts` | Substituir AWS SDK por `aws4fetch` |

---

## Resultado Esperado

Depois desta correção:

1. **Edge Function retorna presigned URL válida** ✅
2. **Frontend faz upload directo para R2** ✅
3. **`stream-process-video` é chamada** ✅
4. **Vídeo aparece no player com estado "A processar..."** ✅
5. **Após transcodificação, player Cloudflare Stream funciona** ✅

---

## Nota Técnica

A biblioteca `aws4fetch` é mantida pela Cloudflare e é a forma recomendada de interagir com R2 a partir de Workers/Edge Functions. O AWS SDK oficial foi desenhado para Node.js e não funciona em ambientes edge.

