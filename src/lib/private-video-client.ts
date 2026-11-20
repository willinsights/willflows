import { supabase } from '@/integrations/supabase/client';
export const PRIVATE_VIDEO_CLIENT_REVISION = 'canonical-client-20261120-1';
export class PrivateVideoError extends Error {constructor(public code:string){super('Não foi possível concluir esta operação.');}}
export async function privateVideoRequest(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('private-video', { body });
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if(error){let code='PRIVATE_REQUEST_FAILED';try{code=(await error.context?.json())?.code??code;}catch{/* refusal without JSON */}throw new PrivateVideoError(code);}
  if (!parsed || typeof parsed !== 'object' || parsed.code) throw new PrivateVideoError(parsed?.code??'PRIVATE_REQUEST_FAILED');
  return parsed;
}
export async function uploadPrivateVideo(file: File, context: {workspaceId: string; projectId: string; taskId: string | null}, operationId: string) {
  try{
    const issued = await privateVideoRequest({action:'issue',operationId,...context,fileName:file.name,bytes:file.size,type:file.type});
    const result = await fetch(issued.url,{method:'PUT',headers:{'Content-Type':file.type},body:file});
    if (!result.ok) throw new Error('Falha no envio. Tente novamente com o mesmo arquivo.');
  }catch(error){if(!(error instanceof PrivateVideoError)||error.code!=='EXPIRED_OR_ALREADY_PERSISTED')throw error;}
  try{return await privateVideoRequest({action:'process',operationId});}
  catch(error){if(!(error instanceof PrivateVideoError)||error.code!=='PROVIDER_UNCERTAIN')throw error;return privateVideoRequest({action:'recover',operationId});}
}