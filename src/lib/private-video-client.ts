import { supabase } from '@/integrations/supabase/client';
export const PRIVATE_VIDEO_CLIENT_REVISION = 'canonical-client-20261120-2';
export class PrivateVideoError extends Error {constructor(public code:string){super('Não foi possível concluir esta operação.');}}
export async function privateVideoRequest(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const publicLink = typeof body.token === 'string' && /^wf2_[0-9a-f]{64}$/.test(body.token);
  if (!publicLink && (sessionError || !sessionData.session?.access_token)) throw new PrivateVideoError('UNAUTHORIZED');
  const invoke = (token?: string) => supabase.functions.invoke('private-video', {
    body,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  let result = await invoke(sessionData.session?.access_token);
  // A rejected request has not performed an operation. Renew once, never retry permission/provider failures.
  if (!publicLink && result.error?.context?.status === 401) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) throw new PrivateVideoError('UNAUTHORIZED');
    result = await invoke(refreshed.session.access_token);
  }
  const { data, error } = result;
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