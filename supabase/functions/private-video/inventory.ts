// Read-only, server-authorized maintenance inventory. Never signs/downloads media or exposes credentials.
import {authenticatePrivateVideo} from './authentication.ts';
export async function inventory(req:Request,body:any,db:any,aws:any,object:(key:string)=>string,stream:(path:string)=>Promise<any>){
 const fail=(code:string,status:number)=>new Response(JSON.stringify({code}),{status});
 const user=await authenticatePrivateVideo(req,db.auth);
 if(!user)return fail('UNAUTHORIZED',401);
 if(typeof body.workspaceId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.workspaceId))return fail('INVALID_SCOPE',400);
 const {data:allowed,error:accessError}=await db.rpc('is_workspace_admin',{_user_id:user,_workspace_id:body.workspaceId});
 if(accessError||allowed!==true)return fail('FORBIDDEN',403);
 const fields='id,workspace_id,project_id,task_id,is_deleted,file_size_bytes,replacement_file_size_bytes,r2_key,replacement_r2_key,cloudflare_stream_uid,replacement_stream_uid,created_at,replaced_at';
 const {data:rows,error}=await db.from('video_versions').select(fields).eq('workspace_id',body.workspaceId).or('is_deleted.is.null,is_deleted.eq.false').order('id').limit(501);
 if(error||!rows||rows.length>500)return fail('INVENTORY_UNAVAILABLE',503);
 const evidence=[];
 for(const row of rows){
  const assets=[];
  for(const replacement of [false,true]){
   const key=replacement?row.replacement_r2_key:row.r2_key;const uid=replacement?row.replacement_stream_uid:row.cloudflare_stream_uid;
   const size=replacement?row.replacement_file_size_bytes:row.file_size_bytes;
   if(!key&&!uid&&!size&&replacement)continue;
   let r2:any={status:'missing_reference'},cf:any={status:'missing_reference'};
   if(typeof key==='string'&&key.startsWith(body.workspaceId+'/')){
    try{const r=await aws.fetch(object(key),{method:'HEAD'});r2={status:r.ok?'ok':r.status===404?'missing':'unavailable',bytes:r.headers.get('content-length')===null?null:Number(r.headers.get('content-length')),etag:r.headers.get('etag')};}catch{r2={status:'unavailable'};}
   }
   if(typeof uid==='string'&&/^[a-f0-9]{32}$/.test(uid)){
    try{const r=await stream('/'+uid);cf={status:r.result?.uid===uid?'ok':'identity_mismatch',ready:r.result?.readyToStream===true,signedOnly:r.result?.requireSignedURLs===true};}catch{cf={status:'unavailable'};}
   }
   assets.push({replacement,key,uid,row_bytes:size,r2,stream:cf});
  }
  evidence.push({row,assets});
 }
 const latest=await db.from('video_versions').select(fields).eq('workspace_id',body.workspaceId).or('is_deleted.is.null,is_deleted.eq.false').order('id').limit(501);
 const snapshot=JSON.stringify(rows);
 const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
 const stable=!latest.error&&JSON.stringify(latest.data)===snapshot;
 return new Response(JSON.stringify({checked_at:new Date().toISOString(),stable,snapshot_hash:await hash(snapshot),evidence}),{status:stable?200:409});
}