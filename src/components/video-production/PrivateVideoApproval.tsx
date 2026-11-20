import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useHlsPlayer} from '@/hooks/useHlsPlayer';
import {Check,Send} from 'lucide-react';
type Review={version:{id:string;file_name:string};comments:Array<{id:string;body:string;client_name:string}>;approval:{client_name:string;notes:string}|null;playback:{url:string;expiresAt:number}|null};
export function PrivateVideoApproval({request,token}:{request:(body:Record<string,unknown>)=>Promise<any>;token:string}){
 const [versions,setVersions]=useState<Array<{id:string;file_name:string}>>([]),[selected,setSelected]=useState(''),[review,setReview]=useState<Review|null>(null);
 const [name,setName]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const videoRef=useRef<HTMLVideoElement>(null);
 useHlsPlayer({videoRef,url:review?.playback?.url??null,type:review?.playback?.url.includes('.m3u8')?'hls':review?.playback?'native':'none'});
 const load=useCallback(async(id:string)=>{
  try{const data=await request({action:'read',versionId:id,token});setReview(data);setError('');}
  catch{setReview(null);setError('Este vídeo não está disponível.');}
 },[request,token]);
 useEffect(()=>{let active=true;request({action:'list',token}).then(data=>{if(!Array.isArray(data?.versions))throw Error('Invalid list');if(active){setVersions(data.versions);setSelected(data.versions[0]?.id??'');}}).catch(()=>{if(active)setError('Este link não está disponível.');});return()=>{active=false;};},[request,token]);
 useEffect(()=>{if(!selected)return;void load(selected);const timer=setInterval(()=>void load(selected),60000);return()=>clearInterval(timer);},[selected,load]);
 const feedback=async(action:'comment'|'approval')=>{
  if(!selected||!name.trim()||busy)return;
  setBusy(true);setError('');
  try{await request({action,token,versionId:selected,requestId:crypto.randomUUID(),name,body,timestamp:videoRef.current?.currentTime??0});setBody('');await load(selected);}
  catch{setError('Não foi possível guardar. Tente novamente.');}finally{setBusy(false);}
 };
 return <main className="min-h-screen bg-background text-foreground">
  <header className="border-b border-border px-4 py-5"><div className="mx-auto max-w-5xl"><h1 className="text-xl font-semibold">WillFlow · Aprovação de vídeo</h1></div></header>
  <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
   <section className="min-w-0 space-y-4">
    <select aria-label="Vídeo" className="w-full rounded-md border border-input bg-background p-2 text-foreground" value={selected} onChange={e=>setSelected(e.target.value)}>{versions.map(v=><option key={v.id} value={v.id}>{v.file_name}</option>)}</select>
    {review?.playback?<video aria-label="Vídeo para aprovação" ref={videoRef} controls playsInline className="aspect-video w-full rounded-md bg-muted"/>:<div className="aspect-video w-full animate-pulse rounded-md bg-muted"/>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {review?.approval&&<p role="status" className="flex items-center gap-2 text-success"><Check size={18}/> Aprovado por {review.approval.client_name}</p>}
   </section>
   <section className="min-w-0 space-y-4">
    <h2 className="font-semibold">Comentários</h2>
    <ul className="space-y-3">{review?.comments.map(c=><li key={c.id} className="break-words border-b border-border pb-3 text-sm"><strong>{c.client_name}</strong><p>{c.body}</p></li>)}</ul>
    <label className="block text-sm">Nome<input className="mt-1 w-full rounded-md border border-input bg-background p-2" value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
    <label className="block text-sm">Comentário<textarea className="mt-1 w-full rounded-md border border-input bg-background p-2" rows={4} maxLength={5000} value={body} onChange={e=>setBody(e.target.value)}/></label>
    <div className="flex flex-wrap gap-2"><Button onClick={()=>void feedback('comment')} disabled={busy||!name.trim()||!body.trim()}><Send/> Enviar</Button><Button variant="outline" onClick={()=>void feedback('approval')} disabled={busy||!name.trim()||Boolean(review?.approval)}><Check/> Aprovar vídeo</Button></div>
   </section>
  </div>
 </main>;
}