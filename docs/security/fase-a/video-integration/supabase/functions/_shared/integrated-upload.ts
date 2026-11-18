import { isUuid, resolveVideoContext, sameVideoContext, storedKeyMatchesVersion, validateUploadFile } from './video-context.ts';
import { signOperation, verifyOperation, type OperationTicket } from './operation-ticket.ts';
import { verifyUploadTicket } from './video-upload-ticket.ts';
import { processDurableUpload } from './video-operation.ts';
export class UploadFailure extends Error { constructor(public code:string,public status:number){super(code);} }
export interface Dependencies {
  db:any; secret:string; bucket:string; now?:()=>number;
  authenticate:(req:Request)=>Promise<string|null>;
  signPut:(key:string,type:string,seconds:number)=>Promise<string>;
  head:(key:string)=>Promise<{size:number;etag:string}|null>;
  copy:(key:string,meta:Record<string,string>,etag:string,size:number)=>Promise<string>;
  findAccepted:(operationId:string)=>Promise<Array<{uid:string;operation_id:string;key:string;workspace_id:string;version_id:string}>>;
}
export function uploadHandlers(d:Dependencies) {
  const now=()=>d.now?.()??Date.now();
  async function rpc(name:string,args:any){const r=await d.db.rpc(name,args);if(r.error||!r.data)throw new UploadFailure('UPLOAD_CONFLICT',409);return r.data;}
  async function user(req:Request){const id=await d.authenticate(req);if(!id)throw new UploadFailure('UNAUTHORIZED',401);return id;}
  async function context(body:any,id:string){
    validateUploadFile(body.fileName,body.fileSize);
    const c=await resolveVideoContext(d.db,{workspace_id:body.workspaceId,project_id:body.projectId,task_id:body.taskId??null});
    const m=await d.db.from('workspace_members').select('role,is_active').eq('workspace_id',c.workspace_id).eq('user_id',id).eq('is_active',true).maybeSingle();
    if(m.error||!m.data||!['admin','edicao'].includes(m.data.role))throw new UploadFailure('FORBIDDEN',403);
    if(body.replaceVersionId){
      if(!isUuid(body.replaceVersionId))throw new UploadFailure('INVALID_INPUT',400);
      const v=await d.db.from('video_versions').select('*').eq('id',body.replaceVersionId).maybeSingle();
      if(v.error||!v.data||v.data.is_deleted||!sameVideoContext(await resolveVideoContext(d.db,v.data),c))throw new UploadFailure('REPLACEMENT_MISMATCH',403);
    }
    return c;
  }
  const ticket=(op:any):OperationTicket=>({operation_id:op.id,user_id:op.user_id,workspace_id:op.workspace_id,project_id:op.project_id,task_id:op.task_id,key:op.object_key,file_name:op.file_name,file_size:Number(op.file_size),replace_version_id:op.replace_id,expires_at:Date.parse(op.expires_at)});
  const args=(id:string,c:any,u:string,key:string,b:any)=>({p_id:id,p_ws:c.workspace_id,p_project:c.project_id,p_task:c.task_id,p_user:u,p_key:key,p_name:b.fileName,p_size:b.fileSize,p_replace:b.replaceVersionId??null});
  async function issue(req:Request,b:any){
    const u=await user(req),c=await context(b,u);
    const id=b.operationId??crypto.randomUUID();if(!isUuid(id))throw new UploadFailure('INVALID_INPUT',400);
    const ext=b.fileName.split('.').pop();const safe=/^[a-zA-Z0-9]{1,10}$/.test(ext)?ext:'mp4';
    const key=`${c.workspace_id}/${c.project_id}/${c.task_id??'project'}/${u}/${id}.${safe}`;
    const op=await rpc('issue_video_operation',args(id,c,u,key,b));
    if(op.state==='aborted'||Date.parse(op.expires_at)<=now())throw new UploadFailure('UPLOAD_EXPIRED',409);
    // Once persisted never mint another PUT: signed URL remains time-bounded, not revocable.
    const uploadUrl=op.state==='issued'?await d.signPut(key,b.mimeType||'video/mp4',Math.min(7200,Math.floor((Date.parse(op.expires_at)-now())/1000))):null;
    return {operationId:op.id,key,uploadUrl,uploadTicket:await signOperation(ticket(op),d.secret),ticketVersion:2,expiresAt:op.expires_at,state:op.state};
  }
  async function promoteLegacy(b:any,c:any,u:string){
    await verifyUploadTicket(b.uploadTicket,{...c,user_id:u,key:b.key,file_name:b.fileName,file_size:b.fileSize,replace_version_id:b.replaceVersionId??null},d.secret,now());
    // Deterministic bridge for all retries of the SAME legacy key, not caller-chosen identity.
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('legacy:'+u+':'+b.key)));
    hash[6]=(hash[6]&15)|64;hash[8]=(hash[8]&63)|128;
    const hex=Array.from(hash.slice(0,16),v=>v.toString(16).padStart(2,'0')).join('');
    const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    return rpc('issue_video_operation',args(id,c,u,b.key,b));
  }
  async function process(req:Request,b:any){
    const u=await user(req),c=await context(b,u);let op:any;
    if(b.operationId){
      if(!isUuid(b.operationId))throw new UploadFailure('INVALID_INPUT',400);
      const r=await d.db.from('video_upload_operations').select('*').eq('id',b.operationId).maybeSingle();
      if(r.error||!r.data||r.data.user_id!==u)throw new UploadFailure('FORBIDDEN',403);op=r.data;
      if(!sameVideoContext(op,c)||op.object_key!==b.key||op.file_name!==b.fileName||Number(op.file_size)!==b.fileSize||op.replace_id!==(b.replaceVersionId??null))throw new UploadFailure('CONTEXT_MISMATCH',403);
      // Expired tickets may only read/recover an ALREADY persisted result; no new mutation/PUT.
      await verifyOperation(b.uploadTicket,ticket(op),d.secret,op.state==='issued'?now():0);
    }else {
      // Old tabs can omit operationId even after receiving a v2 signed ticket.
      // Look up only by the submitted object key, then verify the v2 signature
      // against the exact persisted operation. Never trust decoded unsigned data.
      const byKey=typeof b.key==='string'
        ? await d.db.from('video_upload_operations').select('*').eq('object_key',b.key).maybeSingle()
        : {data:null,error:null};
      if(byKey.error)throw new UploadFailure('UPLOAD_CONFLICT',409);
      if(byKey.data){
        const candidate=byKey.data;
        if(candidate.user_id===u&&sameVideoContext(candidate,c)&&
           candidate.file_name===b.fileName&&Number(candidate.file_size)===b.fileSize&&
           candidate.replace_id===(b.replaceVersionId??null)){
          try {
            await verifyOperation(b.uploadTicket,ticket(candidate),d.secret,
              candidate.state==='issued'?now():0);
            op=candidate;
          } catch {
            // A genuine old v1 receipt can still be promoted below. An invalid
            // v2 signature cannot grant authorization through the v1 verifier.
          }
        }
      }
      if(!op)op=await promoteLegacy(b,c,u);
    }
    if(!storedKeyMatchesVersion(op.object_key,{...c,uploaded_by:u}))throw new UploadFailure('KEY_MISMATCH',403);
    if(op.state==='aborted')throw new UploadFailure('UPLOAD_ABORTED',409);
    let verifiedSource:{size:number;etag:string}|null=null;
    if(op.state==='issued'||op.state==='persisted'){
      if(op.state==='issued'&&Date.parse(op.expires_at)<=now())throw new UploadFailure('UPLOAD_EXPIRED',409);
      verifiedSource=await d.head(op.object_key);
      if(!verifiedSource||verifiedSource.size!==Number(op.file_size)||!verifiedSource.etag)
        throw new UploadFailure('HEAD_MISMATCH',409);
    }
    const result=await processDurableUpload(d.db,op.id,u,d.bucket,()=>{
      if(!verifiedSource)throw new Error('FROZEN_SOURCE_UNCONFIRMED');
      return d.copy(op.object_key,{
        operationId:op.id,key:op.object_key,workspaceId:c.workspace_id,
        projectId:c.project_id,versionId:op.version_id,
      },verifiedSource.etag,verifiedSource.size);
    });
    const current=await d.db.from('video_upload_operations').select('*').eq('id',op.id).maybeSingle();
    const version=await d.db.from('video_versions').select('*').eq('id',op.version_id).maybeSingle();
    if(current.error||version.error||!version.data||version.data.is_deleted||version.data.r2_key!==op.object_key)throw new UploadFailure('RESULT_SUPERSEDED',409);
    if(['uncertain','submitting'].includes(current.data?.state))throw new UploadFailure('PROVIDER_UNCERTAIN',409);
    return {success:true,operationId:op.id,versionId:op.version_id,versionNumber:version.data.version_number,streamUid:version.data.cloudflare_stream_uid,status:current.data?.state??result.state};
  }
  async function abort(req:Request,b:any){const u=await user(req);if(!isUuid(b.operationId))throw new UploadFailure('INVALID_INPUT',400);return rpc('abort_video_operation',{p_id:b.operationId,p_user:u});}
  async function recover(req:Request,b:any){
    const u=await user(req);if(!isUuid(b.operationId))throw new UploadFailure('INVALID_INPUT',400);
    const r=await d.db.from('video_upload_operations').select('*').eq('id',b.operationId).maybeSingle();const op=r.data;
    if(r.error||!op||op.user_id!==u)throw new UploadFailure('FORBIDDEN',403);
    await context({workspaceId:op.workspace_id,projectId:op.project_id,taskId:op.task_id,fileName:op.file_name,fileSize:Number(op.file_size)},u);
    if(!['submitting','uncertain'].includes(op.state))throw new UploadFailure('RECOVERY_NOT_REQUIRED',409);
    const hits=await d.findAccepted(op.id);
    const matches=hits.filter(x=>x.operation_id===op.id&&x.key===op.object_key&&x.workspace_id===op.workspace_id&&x.version_id===op.version_id);
    if(hits.length!==1||matches.length!==1)throw new UploadFailure('PROVIDER_UNCERTAIN',409);
    return rpc('recover_video_submission',{p_id:op.id,p_user:u,p_uid:matches[0].uid});
  }
  return {issue,process,abort,recover};
}
