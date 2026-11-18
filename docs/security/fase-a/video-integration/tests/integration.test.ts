import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {uploadHandlers} from '../supabase/functions/_shared/integrated-upload';
import {issueUploadTicket} from '../supabase/functions/_shared/video-upload-ticket';
import {DurableUploadClient} from '../frontend/lib/durable-upload-client';
import {quotaInfo} from '../frontend/lib/quota';
const ws='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222',user='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const secret='fiction-only';const req=new Request('http://localhost/test');
function fixture(){
 const operations=new Map<string,any>(),versions=new Map<string,any>();let now=1000,authenticated:string|null=user;
 const copy=vi.fn(async()=> 'uid-fixture');let head:{size:number;etag:string}|null={size:100,etag:'fiction'};
 const db={from:(table:string)=>{const filters:any={};const q:any={select:()=>q,eq:(k:string,v:any)=>(filters[k]=v,q),maybeSingle:async()=>({data:table==='workspace_members'?(filters.workspace_id===ws&&filters.user_id===user?{role:'edicao',is_active:true}:null):table==='projects'?(filters.id===project?{id:project,workspace_id:ws}:null):table==='tasks'?{id:other,workspace_id:ws,project_id:project}:table==='video_upload_operations'?operations.get(filters.id):versions.get(filters.id)})};return q;},rpc:async(name:string,p:any)=>{
  if(name==='issue_video_operation'){
   const old=operations.get(p.p_id);if(old)return {data:old};
   const v=versions.get(p.p_replace);const op={id:p.p_id,workspace_id:p.p_ws,project_id:p.p_project,task_id:p.p_task,user_id:p.p_user,object_key:p.p_key,file_name:p.p_name,file_size:p.p_size,replace_id:p.p_replace,version_id:v?.id??crypto.randomUUID(),expires_at:new Date(now+14400000).toISOString(),state:'issued'};operations.set(op.id,op);return {data:op};
  }
  const op=operations.get(p.p_id);if(!op)return {error:{}};
  if(name==='persist_video_operation'){
    if(op.state==='aborted')return {error:{}};
    if(op.state==='issued'){const v=versions.get(op.version_id);versions.set(op.version_id,{id:op.version_id,workspace_id:ws,project_id:project,task_id:null,version_number:v?.version_number??versions.size+1,r2_key:op.object_key,comments:v?.comments??[],uploaded_by:user});op.state='persisted';}return {data:{...op}};
  }
  if(name==='claim_video_submission'){if(op.state!=='persisted')return {data:null};op.state='submitting';return {data:'claim'};}
  if(name==='finish_video_submission'){if(p.p_uid){op.state='processing';versions.get(op.version_id).cloudflare_stream_uid=p.p_uid;}else op.state='uncertain';return {};}
  if(name==='abort_video_operation'){if(!['issued','aborted'].includes(op.state))return {error:{}};op.state='aborted';return {data:op};}
  if(name==='recover_video_submission'){op.state='processing';versions.get(op.version_id).cloudflare_stream_uid=p.p_uid;return {data:op};}
  return {error:{}};
 }};
 const find=vi.fn(async()=>[] as any[]);
 const handlers=uploadHandlers({db,secret,bucket:'fiction',now:()=>now,authenticate:async()=>authenticated,signPut:async key=>'http://localhost/object/'+key,head:async()=>head,copy,findAccepted:find});
 const b:any={operationId:crypto.randomUUID(),workspaceId:ws,projectId:project,taskId:null,fileName:'Corte – ação 🎬.mp4',fileSize:100};
 return {handlers,b,copy,find,operations,versions,issue:async()=>{const issued=await handlers.issue(req,b);return {...b,...issued};},setNow:(v:number)=>now=v,setUser:(u:string|null)=>authenticated=u,setHead:(v:any)=>head=v};
}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('External network forbidden');})));
afterEach(()=>vi.unstubAllGlobals());
it('Unicode emitter→HEAD→processor and 32 concurrent retries invoke provider once',async()=>{const f=fixture(),b=await f.issue();const results=await Promise.allSettled(Array.from({length:32},()=>f.handlers.process(req,b)));expect(results.some(x=>x.status==='fulfilled')).toBe(true);expect(f.copy).toHaveBeenCalledTimes(1);expect(f.versions.size).toBe(1);});
it.each([null,{size:99,etag:'x'},{size:100,etag:''}])('HEAD refuses unconfirmed object %j before persistence',async head=>{const f=fixture(),b=await f.issue();f.setHead(head);await expect(f.handlers.process(req,b)).rejects.toThrow('HEAD_MISMATCH');expect(f.copy).not.toHaveBeenCalled();expect(f.versions.size).toBe(0);});
it.each(['workspaceId','projectId','fileName','fileSize','replaceVersionId'])('signed context cannot change %s',async key=>{const f=fixture(),b=await f.issue();await expect(f.handlers.process(req,{...b,[key]:key==='fileSize'?101:other})).rejects.toThrow();expect(f.copy).not.toHaveBeenCalled();});
it('signed v1 old tab is promoted deterministically and retried without duplicate',async()=>{const f=fixture();const key=`${ws}/${project}/project/${user}/old-tab.mp4`;const ticket=await issueUploadTicket({workspace_id:ws,project_id:project,task_id:null,user_id:user,key,file_name:f.b.fileName,file_size:100,replace_version_id:null,expires_at:2000},secret);const b={...f.b,operationId:undefined,key,uploadTicket:ticket};await f.handlers.process(req,b);await f.handlers.process(req,b);expect(f.copy).toHaveBeenCalledTimes(1);expect(f.operations.size).toBe(1);});
it('expired issued ticket cannot persist, persisted result can read after expiry',async()=>{const f=fixture(),b=await f.issue();f.setNow(20_000_000);await expect(f.handlers.process(req,b)).rejects.toThrow('expired');expect(f.copy).not.toHaveBeenCalled();const g=fixture(),c=await g.issue();await g.handlers.process(req,c);g.setNow(20_000_000);expect((await g.handlers.process(req,c)).versionId).toBeTruthy();expect(g.copy).toHaveBeenCalledTimes(1);});
it('provider accepted timeout never resubmits; exact recovery links existing UID',async()=>{const f=fixture(),b=await f.issue();f.copy.mockRejectedValueOnce(new Error('timeout'));await expect(f.handlers.process(req,b)).rejects.toThrow('uncertain');await expect(f.handlers.process(req,b)).rejects.toThrow('PROVIDER_UNCERTAIN');expect(f.copy).toHaveBeenCalledTimes(1);const op=f.operations.get(b.operationId);f.find.mockResolvedValueOnce([{uid:'recovered',operation_id:op.id,key:op.object_key,workspace_id:ws,version_id:op.version_id}]);await f.handlers.recover(req,b);expect(f.versions.get(op.version_id).cloudflare_stream_uid).toBe('recovered');});
it('zero or ambiguous provider matches never unlock another submission',async()=>{const f=fixture(),b=await f.issue();f.copy.mockRejectedValueOnce(new Error('timeout'));await expect(f.handlers.process(req,b)).rejects.toThrow();await expect(f.handlers.recover(req,b)).rejects.toThrow('PROVIDER_UNCERTAIN');f.find.mockResolvedValueOnce([{},{}]);await expect(f.handlers.recover(req,b)).rejects.toThrow('PROVIDER_UNCERTAIN');expect(f.copy).toHaveBeenCalledTimes(1);});
it('abort stops persistence, not deletes; changed user cannot access operation',async()=>{const f=fixture(),b=await f.issue();await f.handlers.abort(req,b);await expect(f.handlers.process(req,b)).rejects.toThrow('UPLOAD_ABORTED');f.setUser(other);await expect(f.handlers.process(req,b)).rejects.toThrow();f.setUser(null);await expect(f.handlers.issue(req,f.b)).rejects.toThrow('UNAUTHORIZED');expect(f.copy).not.toHaveBeenCalled();});
it('replacement keeps ID, number and comments in integrated candidate',async()=>{const f=fixture(),b=await f.issue();const first=await f.handlers.process(req,b);const v=f.versions.get(first.versionId);v.comments=['fiction-comment'];f.b={...f.b,operationId:crypto.randomUUID(),replaceVersionId:first.versionId};const issued=await f.handlers.issue(req,f.b);const result=await f.handlers.process(req,{...f.b,...issued});expect(result.versionId).toBe(first.versionId);expect(result.versionNumber).toBe(1);expect(f.versions.get(first.versionId).comments).toEqual(['fiction-comment']);});
it('total is 12000 not 14000; zero/missing/error fail closed; replacement uses delta',()=>{const q=quotaInfo({storage_used_bytes:11000,storage_limit_bytes:12000});expect(q.limitBytes).toBe(12000);expect(q.canUpload(1001)).toBe(false);expect(q.canUpload(2000,1000)).toBe(true);expect(quotaInfo(null).canUpload(1)).toBe(false);expect(quotaInfo({storage_used_bytes:0,storage_limit_bytes:0}).canUpload(1)).toBe(false);expect(quotaInfo({storage_used_bytes:0,storage_limit_bytes:12000},true).canUpload(1)).toBe(false);});
it('frontend retries process with same ID and no duplicate PUT; expiry never silently restarts',async()=>{let attempt=0;const bodies:any[]=[];const put=vi.fn(async()=>{});const invoke=vi.fn(async(name,b)=>{bodies.push(b);if(name==='r2-upload-url')return {uploadUrl:'local',key:'key',uploadTicket:'ticket'};if(attempt++===0)throw new Error('UPLOAD_EXPIRED');return {versionId:'v',status:'processing'};});const client=new DurableUploadClient({invoke,put});const file=new File(['fiction'],'ação.mp4');await expect(client.run(file,{workspaceId:ws})).rejects.toThrow('UPLOAD_EXPIRED');await client.run(file,{workspaceId:ws});expect(new Set(bodies.map(x=>x.operationId)).size).toBe(1);expect(put).toHaveBeenCalledTimes(1);});


it('coalesces simultaneous run calls for the same File/context into one issue, PUT and process',async()=>{
  const invocations:string[]=[];
  let releasePut:()=>void=()=>{};
  const waitForPut=new Promise<void>(resolve=>{releasePut=resolve;});
  const put=vi.fn(async()=>{await waitForPut;});
  const invoke=vi.fn(async(name:string,body?:any)=>{
    invocations.push(name);
    if(name==='r2-upload-url')return {uploadUrl:'http://localhost/fixture',key:'same-key',uploadTicket:'signed'};
    return {versionId:'one-version',status:'processing'};
  });
  const client=new DurableUploadClient({invoke,put});
  const file=new File(['fiction'],'sample.mp4');
  const context={workspaceId:ws,projectId:project};
  const first=client.run(file,context);
  const second=client.run(file,context);
  expect(invocations.filter(x=>x==='r2-upload-url')).toHaveLength(1);
  releasePut();
  const results=await Promise.all([first,second]);
  expect(results).toEqual([{versionId:'one-version',status:'processing'},{versionId:'one-version',status:'processing'}]);
  expect(put).toHaveBeenCalledTimes(1);
  expect(invocations.filter(x=>x==='stream-process-video')).toHaveLength(1);
  expect(new Set(invoke.mock.calls.map(call=>call[1]?.operationId).filter(Boolean)).size).toBe(1);
});

it('retains the same operation and signed URL after a failed PUT instead of issuing a new upload',async()=>{
  const issued:any[]=[];
  const invoke=vi.fn(async(name:string,body:any)=>{
    if(name==='r2-upload-url'){issued.push(body);return {uploadUrl:'http://localhost/fixture',key:'same-key',uploadTicket:'signed'};}
    return {versionId:'recovered-version',status:'processing'};
  });
  let attempts=0;
  const put=vi.fn(async()=>{attempts++;if(attempts===1)throw new Error('NETWORK_INTERRUPTED');});
  const client=new DurableUploadClient({invoke,put});
  const file=new File(['fixture'],'retry.mp4');
  const context={workspaceId:ws,projectId:project};
  await expect(client.run(file,context)).rejects.toThrow('NETWORK_INTERRUPTED');
  const result=await client.run(file,context);
  expect(result.versionId).toBe('recovered-version');
  expect(issued).toHaveLength(1);
  expect(put).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls.find(call=>call[0]==='stream-process-video')?.[1].operationId).toBe(issued[0].operationId);
});


it('quota preflight rejects impossible replacement credit and unsafe integer arithmetic',()=>{
  const existing=quotaInfo({storage_used_bytes:100,storage_limit_bytes:100});
  expect(existing.canUpload(100,101)).toBe(false);
  expect(existing.canUpload(100,100)).toBe(true);
  expect(existing.canUpload(101,100)).toBe(false);
  expect(existing.canUpload(1, -1)).toBe(false);
  const large=quotaInfo({storage_used_bytes:Number.MAX_SAFE_INTEGER-1,storage_limit_bytes:Number.MAX_SAFE_INTEGER});
  expect(large.canUpload(3)).toBe(false);
  expect(large.canUpload(2,1)).toBe(true);
  expect(quotaInfo({storage_used_bytes:NaN,storage_limit_bytes:100}).canUpload(1)).toBe(false);
});
