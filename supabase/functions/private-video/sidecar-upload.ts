import type {SidecarDependencies} from './sidecar-handler.ts';
export interface PrivateOperation {
 id:string;operation_id:string;workspace_id:string;project_id:string;task_id:string|null;
 author_id:string;object_key:string;bytes:number;file_name:string;state:string;expires_at:string;submission_id:string|null;stream_uid:string|null;
}
export interface PrivateUploadDependencies extends Pick<SidecarDependencies,'rpc'|'authenticate'> {
 signPut:(key:string,type:string,seconds:number)=>Promise<string>;
 head:(key:string)=>Promise<{bytes:number;etag:string}|null>;
 // Implementation must use conditional immutable R2 copy and signed-only Stream ingestion.
 freezeAndCopy:(v:PrivateOperation,claim:string,etag:string,hold:(key:string)=>Promise<void>)=>Promise<string>;
 findAccepted:(v:PrivateOperation)=>Promise<Array<{uid:string;operation_id:string;version_id:string;workspace_id:string;key:string}>>;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function privateUpload(req:Request,d:PrivateUploadDependencies):Promise<Response>{
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store'};
 const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 const call=async(name:string,args:Record<string,unknown>)=>{const r=await d.rpc(name,args);if(r.error)throw Error('PRIVATE_OPERATION_DENIED');return r.data;};
 try{
  if(req.method!=='POST')return answer({code:'METHOD_NOT_ALLOWED'},405);
  const user=await d.authenticate(req);if(!user)return answer({code:'UNAUTHORIZED'},401);
  const b=await req.json();if(!b||typeof b!=='object'||Array.isArray(b)||!uuid.test(b.operationId??''))return answer({code:'INVALID_INPUT'},400);
  if(b.action==='issue'){
   if(!uuid.test(b.workspaceId??'')||!uuid.test(b.projectId??'')||(b.taskId!=null&&!uuid.test(b.taskId))||typeof b.fileName!=='string'||!b.fileName.trim()||b.fileName.length>255||!Number.isSafeInteger(b.bytes)||b.bytes<=0||b.bytes>5*1024**3||!['video/mp4','video/quicktime','video/webm','video/x-msvideo','video/x-matroska'].includes(b.type))return answer({code:'INVALID_INPUT'},400);
   const v:PrivateOperation=await call('private_video_issue',{p_operation:b.operationId,p_ws:b.workspaceId,p_project:b.projectId,p_task:b.taskId??null,p_user:user,p_name:b.fileName,p_bytes:b.bytes});
   const seconds=Math.floor((new Date(v.expires_at).getTime()-Date.now())/1000);
   if(v.state!=='issued'||seconds<=0)return answer({code:'EXPIRED_OR_ALREADY_PERSISTED'},409);
   return answer({operationId:v.operation_id,versionId:v.id,url:await d.signPut(v.object_key,b.type,Math.min(seconds,7200))},201);
  }
  let v:PrivateOperation=await call('private_video_operation',{p_operation:b.operationId,p_user:user});
  if(!v)return answer({code:'PRIVATE_OPERATION_DENIED'},403);
  if(b.action==='abort'||b.action==='withdraw'){
   await call('private_video_withdraw',{p_operation:v.operation_id,p_user:user,p_abort:b.action==='abort'});return answer({success:true});
  }
  if(b.action==='recover'){
   if(v.state==='ready')return answer({versionId:v.id,state:v.state});
   if(!['submitting','uncertain'].includes(v.state)||!v.submission_id)return answer({code:'NOT_RECOVERABLE'},409);
   const matches=(await d.findAccepted(v)).filter(x=>x.operation_id===v.operation_id&&x.workspace_id===v.workspace_id&&x.version_id===v.id&&x.key===v.object_key&&/^[a-f0-9]{32}$/.test(x.uid));
   if(matches.length!==1)return answer({code:'PROVIDER_UNCERTAIN'},409);
   await call('private_video_recover',{p_operation:v.operation_id,p_user:user,p_claim:v.submission_id,p_uid:matches[0].uid});
   return answer({versionId:v.id,state:'ready'});
  }
  if(b.action!=='process')return answer({code:'INVALID_ACTION'},400);
  if(v.state==='ready')return answer({versionId:v.id,state:v.state});
  if(['submitting','uncertain','aborted','withdrawn'].includes(v.state))return answer({code:'PROVIDER_UNCERTAIN'},409);
  const observed=await d.head(v.object_key);
  if(!observed||observed.bytes!==Number(v.bytes)||!observed.etag)return answer({code:'UPLOADED_OBJECT_MISMATCH'},409);
  v=await call('private_video_persist',{p_operation:v.operation_id,p_user:user});
  const claim=await call('private_video_claim',{p_operation:v.operation_id,p_user:user});
  if(typeof claim!=='string')return answer({code:'PROVIDER_UNCERTAIN'},409);
  try{
   const uid=await d.freezeAndCopy(v,claim,observed.etag,async key=>{
    await call('private_video_hold',{p_operation:v.operation_id,p_claim:claim,p_key:key});
   });
   const done=await call('private_video_finish',{p_operation:v.operation_id,p_claim:claim,p_uid:uid});
   if(done!==true)return answer({code:'PROVIDER_UNCERTAIN'},409);
   return answer({versionId:v.id,state:'ready'});
  }catch{
   // Lost provider response is never evidence that no copy happened. Leave permanent uncertainty.
   try{await call('private_video_finish',{p_operation:v.operation_id,p_claim:claim,p_uid:null});}catch{/* durable submitting is also non-reclaimable */}
   return answer({code:'PROVIDER_UNCERTAIN'},409);
  }
 }catch{return answer({code:'PRIVATE_UPLOAD_UNAVAILABLE'},403);}
}