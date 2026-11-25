// Candidate-only entrypoint core. All RPCs below are service-only; IDs come from verified auth.
export interface SidecarDependencies {
 rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:any;error:any}>;
 authenticate:(req:Request)=>Promise<string|null>;
 sign:(uid:string)=>Promise<{url:string;thumbnail:string;expiresAt:number}>;
 ready:(uid:string)=>Promise<boolean>;
 download?:(key:string)=>Promise<string>;
 branding?:(workspaceId:string)=>Promise<{name:string;logo_url:string|null}>;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function digestPrivateLink(token:unknown):Promise<string> {
 if(typeof token!=='string'||!/^wf2_[0-9a-f]{64}$/.test(token))throw Error('INVALID_LINK');
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function sidecarRequest(req:Request,d:SidecarDependencies):Promise<Response> {
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Authorization'};
 const answer=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 const rpc=async(name:string,args:Record<string,unknown>)=>{
  const result=await d.rpc(name,args);if(result.error||result.data===null)throw Error('PRIVATE_CONTEXT_DENIED');return result.data;
 };
 try {
  if(req.method!=='POST')return answer({code:'METHOD_NOT_ALLOWED'},405);
  const b=await req.json();
  if(!b||Array.isArray(b)||typeof b!=='object')return answer({code:'INVALID_INPUT'},400);
  const withLabels=async(list:any[])=>{if(!Array.isArray(list)||!list.length)return list;const labels=await rpc('private_video_deliverable_labels',{p_versions:list.map((v:any)=>v.id)});return list.map((v:any)=>({...v,label:labels?.[v.id]??null}));};
  const user=await d.authenticate(req); // Never use b.userId or decoded unverified JWT claims.
  const digest=b.token===undefined?null:await digestPrivateLink(b.token);
  if(b.action==='link'){
   if(!user||!uuid.test(b.workspaceId??'')||!uuid.test(b.projectId??'')||(b.taskId!=null&&!uuid.test(b.taskId)))return answer({code:'INVALID_INPUT'},400);
   const bytes=crypto.getRandomValues(new Uint8Array(32));
   const token='wf2_'+Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
   await rpc('private_video_link',{p_digest:await digestPrivateLink(token),p_ws:b.workspaceId,p_project:b.projectId,p_task:b.taskId??null,p_user:user,p_expires:new Date(Date.now()+7*86400000).toISOString()});
   return answer({token},201); // Transient only; never logged or returned by subsequent reads.
  }
  if(b.action==='revoke'){
   if(!user||!digest)return answer({code:'UNAUTHORIZED'},401);
   const revoked=await rpc('private_video_revoke',{p_digest:digest,p_user:user});
   if(revoked!==true)return answer({code:'PRIVATE_VIDEO_UNAVAILABLE'},403);
   return answer({success:true});
  }
  if(b.action==='list'){
   if(!digest&&(!user||!uuid.test(b.workspaceId??'')))return answer({code:'UNAUTHORIZED'},401);
   return answer({versions:await withLabels(await rpc('private_video_list',{p_user:digest?null:user,p_digest:digest,p_ws:digest?null:b.workspaceId}))});
  }
  if(['context','client-list','revoke-scope','usage'].includes(b.action)){
   if(!user||digest||!uuid.test(b.workspaceId??'')||(b.projectId!=null&&!uuid.test(b.projectId))||(b.taskId!=null&&!uuid.test(b.taskId)))return answer({code:'UNAUTHORIZED'},401);
   if(b.action==='usage')return answer(await rpc('private_video_usage',{p_ws:b.workspaceId,p_user:user}));
   if(b.action!=='client-list'&&!uuid.test(b.projectId??''))return answer({code:'INVALID_INPUT'},400);
   const params={p_ws:b.workspaceId,p_project:b.projectId??null,p_task:b.taskId??null,p_user:user};
   if(b.action==='context')return answer(await rpc('private_video_context',params));
   if(b.action==='revoke-scope'){await rpc('private_video_revoke_scope',params);return answer({success:true});}
   return answer({versions:await withLabels(await rpc('private_video_client_list',params))});
  }
  if(!uuid.test(b.versionId??'')||(!user&&!digest))return answer({code:'UNAUTHORIZED'},401);
  const args={p_version:b.versionId,p_user:digest?null:user,p_digest:digest};
  const initial=await rpc('private_video_read',args);
  if(b.action==='set-deliverable'){
   if(!user||digest||typeof b.label!=='string'||!b.label.trim()||b.label.length>120)return answer({code:'INVALID_INPUT'},400);
   await rpc('private_video_set_deliverable',{p_version:b.versionId,p_user:user,p_label:b.label.trim()});return answer({success:true});
  }
  // Approval closes the review: no further comments or approvals on that version (server-enforced).
  if(initial.approval&&['client-comment','client-approval','comment','approval'].includes(b.action))return answer({code:'ALREADY_APPROVED'},409);
  if(b.action==='download'){
   if(!d.download)return answer({code:'DOWNLOAD_UNAVAILABLE'},503);
   if(initial.version.state!=='ready')return answer({code:'DOWNLOAD_UNAVAILABLE'},409);
   const url=await d.download('__willflow_v2/'+initial.version.workspace_id+'/'+initial.version.operation_id+'/frozen.mp4');
   const latest=await rpc('private_video_read',args);
   if(latest.version.object_key!==initial.version.object_key||latest.version.generation!==initial.version.generation)throw Error('PRIVATE_CONTEXT_DENIED');
   return answer({url,fileName:latest.version.file_name});
  }
  if(['client-comment','client-approval','client-withdraw'].includes(b.action)){
   if(!user||digest)return answer({code:'UNAUTHORIZED'},401);
   if(b.action==='client-withdraw'){await rpc('private_video_client_withdraw',{p_version:b.versionId,p_user:user});return answer({success:true});}
   if(!uuid.test(b.requestId??'')||typeof b.body!=='string'||b.body.length>5000||!Number.isFinite(b.timestamp??0)||(b.timestamp??0)<0)return answer({code:'INVALID_INPUT'},400);
   await rpc('private_video_client_feedback',{p_request:b.requestId,p_version:b.versionId,p_user:user,p_type:b.action==='client-comment'?'comment':'approval',p_body:b.body,p_timestamp:b.timestamp??0});return answer({success:true},201);
  }
  if(b.action==='read'){
   const v=initial.version;
   let playback=null;
   if(v.stream_uid&&v.state==='ready'&&await d.ready(v.stream_uid))playback=await d.sign(v.stream_uid);
   const latest=await rpc('private_video_read',args); // revoke/withdraw/parent removal during provider I/O deny release.
   if(latest.version.stream_uid!==v.stream_uid||latest.version.generation!==v.generation)throw Error('PRIVATE_CONTEXT_DENIED');
   const safe=(row:any)=>({id:row.id,file_name:row.file_name,file_size_bytes:row.bytes,created_at:row.created_at,generation:row.generation,stream_status:playback?'ready':'processing'});
   return answer({version:safe(latest.version),comments:latest.comments.map((c:any)=>({id:c.id,video_version_id:c.version_id,body:c.body,timestamp_seconds:c.timestamp_seconds,client_name:c.name,created_at:c.created_at})),
    approval:latest.approval?{client_name:latest.approval.name,notes:latest.approval.notes,approved_at:latest.approval.approved_at}:null,playback,
    branding:digest&&d.branding?await d.branding(latest.version.workspace_id).catch(()=>null):null});
  }
  if(b.action==='comment'||b.action==='approval'){
   if(!digest||!uuid.test(b.requestId??'')||typeof b.name!=='string'||b.name.trim().length<1||b.name.length>120||typeof b.body!=='string'||b.body.length>5000||(b.action==='comment'&&!b.body.trim())||!Number.isFinite(b.timestamp??0)||(b.timestamp??0)<0)return answer({code:'INVALID_INPUT'},400);
   await rpc('private_video_feedback',{p_request:b.requestId,p_version:b.versionId,p_digest:digest,p_type:b.action,p_name:b.name.trim(),p_body:b.body,p_timestamp:b.timestamp??0});
   return answer({success:true},201);
  }
  return answer({code:'INVALID_ACTION'},400);
 } catch {return answer({code:'PRIVATE_VIDEO_UNAVAILABLE'},403);}
}