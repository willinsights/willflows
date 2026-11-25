import {useCallback,useEffect,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useHlsPlayer} from '@/hooks/useHlsPlayer';
import {privateVideoRequest,uploadPrivateVideo,PRIVATE_VIDEO_CLIENT_REVISION,PrivateVideoError} from '@/lib/private-video-client';
import {ArrowLeftRight,Check,Copy,Download,Link,RefreshCw,Send,Trash2,Upload,X} from 'lucide-react';
import { CanonicalVideoComparison } from './CanonicalVideoComparison';
type Version={id:string;file_name:string;bytes:number;state:string;created_at:string};
type Review={version:{id:string};comments:Array<{id:string;client_name:string;body:string;timestamp_seconds:number}>;approval:{client_name:string}|null;playback:{url:string;expiresAt:number}|null};
export function CanonicalVideoStudio({workspaceId,projectId,taskId,onContext,onVersions}:{workspaceId:string;projectId:string;taskId:string|null;onContext?:(enabled:boolean)=>void;onVersions?:(count:number)=>void}) {
 const [versions,setVersions]=useState<Version[]>([]),[selected,setSelected]=useState(''),[review,setReview]=useState<Review|null>(null);
 const [context,setContext]=useState<{enabled:boolean;canEdit:boolean;legacyBytes:number;privateBytes:number;limitBytes:number}|null>(null);
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[comment,setComment]=useState(''),[link,setLink]=useState<{token:string;url:string}|null>(null);
 const [comparing,setComparing]=useState(false),[status,setStatus]=useState('');
 const selectedRef=useRef(selected);
 selectedRef.current=selected;
 const operation=useRef<string|null>(null),input=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),query=useQueryClient();
 const comparable=versions.map((version,index)=>({...version,version_number:versions.length-index}))
  .filter(version=>version.state==='ready');
 const showComparison=comparing&&comparable.length>1;
 const playback=showComparison||review?.version.id!==selected?null:review.playback;
 useHlsPlayer({videoRef:video,url:playback?.url??null,type:playback?'hls':'none'});
 const refresh=useCallback(async()=>{
  const [c,list]=await Promise.all([privateVideoRequest({action:'context',workspaceId,projectId,taskId}),privateVideoRequest({action:'client-list',workspaceId,projectId,taskId})]);
  setContext(c);onContext?.(c.enabled);onVersions?.(list.versions.length);setVersions(list.versions);setSelected(old=>list.versions.some((v:Version)=>v.id===old)?old:list.versions[0]?.id??'');
 },[workspaceId,projectId,taskId,onContext,onVersions]);
 useEffect(()=>{setVersions([]);setSelected('');setReview(null);setContext(null);void refresh().catch(()=>setError('Não foi possível carregar os vídeos.'));},[refresh]);
 const read=useCallback(async()=>{if(!selected)return;try{const next=await privateVideoRequest({action:'read',versionId:selected});if(selectedRef.current!==selected||next.version.id!==selected)return;setReview(old=>old?.version.id===next.version.id&&old?.playback&&next.playback&&old.playback.expiresAt>Date.now()/1000+60?{...next,playback:old.playback}:next);}catch{if(selectedRef.current===selected){setReview(null);setError('Este vídeo não está disponível.');}}},[selected]);
 useEffect(()=>{setReview(null);void read();const timer=setInterval(()=>void read(),10000);return()=>clearInterval(timer);},[read]);
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');setStatus('');try{await work();}catch(e){
  const code=e instanceof PrivateVideoError?e.code:null;
  if(code==='PROVIDER_UNCERTAIN')setError('O envio ainda não está confirmado. Tenta recuperar o mesmo envio.');
  else if(code==='UPLOADED_OBJECT_MISMATCH')setError('O ficheiro no armazenamento ainda não foi confirmado. Repete o envio com o mesmo ficheiro ou cancela esta tentativa.');
  else setError(e instanceof Error?e.message:'Não foi possível concluir.');
 }finally{setBusy(false);}};
 const upload=()=>run(async()=>{
  if(!file||!context?.enabled||!context.canEdit)return;
  operation.current??=crypto.randomUUID();
  const result=await uploadPrivateVideo(file,{workspaceId,projectId,taskId},operation.current).catch(error=>{
   if(error instanceof PrivateVideoError&&error.code==='INVALID_INPUT'){
    operation.current=null;
    throw new Error('O formato, nome ou tamanho do ficheiro não é aceite. Escolhe outro vídeo.');
   }
   throw error;
  });
  operation.current=null;setFile(null);if(input.current)input.current.value='';await refresh();setSelected(result.versionId);await query.invalidateQueries({queryKey:['workspace-storage',workspaceId]});
 });
 const cancelUpload=()=>run(async()=>{
  if(!operation.current)return;
  await privateVideoRequest({action:'abort',operationId:operation.current});
  operation.current=null;
  setFile(null);
  if(input.current)input.current.value='';
  setStatus('Tentativa de envio cancelada.');
 });
 const feedback=(action:'client-comment'|'client-approval')=>run(async()=>{await privateVideoRequest({action,versionId:selected,requestId:crypto.randomUUID(),body:comment,timestamp:video.current?.currentTime??0});setComment('');await read();});
 return <section className="space-y-4" data-video-client-revision={PRIVATE_VIDEO_CLIENT_REVISION} aria-label="Vídeos novos">
  {context&&<p className="text-sm text-muted-foreground">{((context.legacyBytes+context.privateBytes)/1024**3).toFixed(2)} / {(context.limitBytes/1024**3).toFixed(2)} GB</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {status&&<p role="status" className="text-sm text-muted-foreground">{status}</p>}
  {showComparison&&<CanonicalVideoComparison versions={comparable} initialVersionId={selected} onClose={()=>setComparing(false)}/>}
  <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]">
   <div className="min-w-0 space-y-4">
    {versions.length>0&&<select aria-label="Selecionar versão nova" className="w-full rounded-md border border-input bg-background p-2 text-foreground" value={selected} onChange={e=>setSelected(e.target.value)}>{versions.map((v,i)=><option key={v.id} value={v.id}>V{versions.length-i} · {v.file_name}</option>)}</select>}
    {playback?<video ref={video} aria-label="Prévia do vídeo novo" controls playsInline className="aspect-video w-full rounded-md bg-muted"/>:!showComparison&&<div className="flex aspect-video items-center justify-center rounded-md bg-muted text-muted-foreground">{selected?'A processar vídeo':'Nenhum vídeo selecionado'}</div>}
    {review?.approval&&<p role="status" className="flex items-center gap-2 text-success"><Check size={18}/>Aprovado por {review.approval.client_name}</p>}
    {context?.enabled&&context.canEdit&&<div className="space-y-3">
     <input ref={input} type="file" className="hidden" aria-label="Arquivo de vídeo novo" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska" disabled={busy} onChange={e=>{const next=e.target.files?.[0]??null;if(next&&next.size>5*1024**3){setError('Arquivo muito grande. Máximo 5 GB.');setFile(null);return;}setFile(next);operation.current=null;}}/>
     <div className="flex min-w-0 items-center gap-3"><Button variant="outline" disabled={busy||!!operation.current} onClick={()=>input.current?.click()}><Upload/> Escolher vídeo</Button>{file&&<span className="min-w-0 break-words text-sm">{file.name}</span>}</div>
     <Button onClick={upload} disabled={!file||busy}><Upload/> {busy?'A processar…':operation.current?'Retomar envio':selected?'Carregar nova versão':'Carregar vídeo'}</Button>
     {file&&operation.current&&<Button variant="ghost" disabled={busy} onClick={()=>void cancelUpload()}>Cancelar tentativa de envio</Button>}
    </div>}
   </div>
   <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap gap-2">
     {comparable.length>1&&!showComparison&&<Button variant="outline" onClick={()=>setComparing(true)}><ArrowLeftRight/> Comparar versões</Button>}
     <Button variant="outline" size="icon" aria-label="Atualizar vídeos novos" disabled={busy} onClick={()=>void run(refresh)}><RefreshCw/></Button>
     {selected&&<Button variant="outline" size="icon" aria-label="Baixar vídeo novo" disabled={busy} onClick={()=>void run(async()=>{const result=await privateVideoRequest({action:'download',versionId:selected});const a=document.createElement('a');a.href=result.url;a.download=result.fileName;a.rel='noreferrer';a.click();})}><Download/></Button>}
     {context?.canEdit&&selected&&<Button variant="outline" size="icon" aria-label="Retirar vídeo novo" disabled={busy} onClick={()=>{if(window.confirm('Retirar este vídeo da aprovação? O histórico será preservado.'))void run(async()=>{await privateVideoRequest({action:'client-withdraw',versionId:selected});await refresh();await query.invalidateQueries({queryKey:['workspace-storage',workspaceId]});});}}><Trash2/></Button>}
    </div>
    {context?.canEdit&&selected&&<>
     <Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{const created=await privateVideoRequest({action:'link',workspaceId,projectId,taskId});setLink({token:created.token,url:`${window.location.origin}/video-approval/${created.token}`});})}><Link/> Gerar link de aprovação</Button>
     {link&&<>
      <div className="flex min-w-0 gap-2"><Input aria-label="Link de aprovação novo" readOnly value={link.url}/><Button variant="outline" size="icon" disabled={busy} aria-label="Copiar link novo" onClick={()=>void navigator.clipboard.writeText(link.url)}><Copy/></Button></div>
      <Button variant="ghost" disabled={busy} onClick={()=>void run(async()=>{await privateVideoRequest({action:'revoke',token:link.token});setLink(null);setStatus('Link revogado.');})}>Revogar este link</Button>
     </>}
     <Button variant="ghost" disabled={busy} onClick={()=>{if(window.confirm('Revogar todos os links de aprovação deste âmbito?'))void run(async()=>{await privateVideoRequest({action:'revoke-scope',workspaceId,projectId,taskId});setLink(null);setStatus('Links revogados.');});}}><X/> Revogar todos os links</Button>
    </>}
    <h3 className="font-semibold">Comentários</h3>
    <ul className="space-y-3">{review?.comments.map(c=><li key={c.id} className="break-words border-b border-border pb-2 text-sm"><strong>{c.client_name}</strong><p>{c.body}</p></li>)}</ul>
    {selected&&<><Textarea aria-label="Comentário da equipe" value={comment} maxLength={5000} onChange={e=>setComment(e.target.value)}/><Button disabled={busy||showComparison||!comment.trim()} onClick={()=>void feedback('client-comment')}><Send/> Enviar comentário</Button>{context?.canEdit&&<Button variant="outline" disabled={busy||showComparison||!!review?.approval} onClick={()=>void feedback('client-approval')}><Check/> Aprovar vídeo</Button>}</>}
   </div>
  </div>
 </section>;
}