import {useQuery,useQueryClient} from '@tanstack/react-query';
import {privateVideoRequest} from '@/lib/private-video-client';
import {Button} from '@/components/ui/button';
import {Trash2} from 'lucide-react';
import {useState} from 'react';
type Row={id:string;file_name:string;bytes:number;project_name:string;canEdit:boolean};
export function CanonicalStorageList({workspaceId}:{workspaceId:string}) {
 const query=useQueryClient(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {data=[]}=useQuery<Row[]>({queryKey:['canonical-storage',workspaceId],queryFn:async()=>{const r=await privateVideoRequest({action:'client-list',workspaceId});return r.versions;}});
 if(!data.length)return null;
 return <section className="space-y-3" aria-label="Armazenamento de vídeos novos"><h3 className="font-semibold">Vídeos novos</h3>{error&&<p role="alert" className="text-destructive">{error}</p>}
  {data.map(v=><div key={v.id} className="flex items-center gap-3 border-b border-border py-3"><div className="min-w-0 flex-1"><p className="break-words font-medium">{v.file_name}</p><p className="text-sm text-muted-foreground">{v.project_name} · {(v.bytes/1024**2).toFixed(2)} MB</p></div>{v.canEdit&&<Button variant="ghost" size="icon" aria-label={`Retirar ${v.file_name}`} disabled={busy} onClick={async()=>{if(!window.confirm('Retirar este vídeo? O histórico será preservado.'))return;setBusy(true);try{await privateVideoRequest({action:'client-withdraw',versionId:v.id});await query.invalidateQueries({queryKey:['canonical-storage',workspaceId]});await query.invalidateQueries({queryKey:['workspace-storage',workspaceId]});}catch{setError('Não foi possível retirar o vídeo.');}finally{setBusy(false);}}}><Trash2/></Button>}</div>)}
 </section>;
}