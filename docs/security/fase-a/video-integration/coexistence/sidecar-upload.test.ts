import {it,expect,vi} from 'vitest';
import {privateUpload,type PrivateUploadDependencies} from './sidecar-upload';
const ws='11111111-1111-4111-8111-111111111111',op='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
function fixture(){
 const v={id,operation_id:op,workspace_id:ws,project_id:id,task_id:null,author_id:ws,object_key:'__willflow_v2/'+ws+'/'+op+'/input.mp4',bytes:10,file_name:'Vídeo 🎬.mp4',state:'issued',expires_at:new Date(Date.now()+7200000).toISOString(),submission_id:null as string|null,stream_uid:null as string|null};
 const rpc=vi.fn(async(name:string,args:any)=>{
  if(name==='private_video_issue'||name==='private_video_operation')return {data:{...v},error:null};
  if(name==='private_video_persist'){v.state='persisted';return {data:{...v},error:null};}
  if(name==='private_video_claim'){if(v.state!=='persisted')return {data:null,error:null};v.state='submitting';v.submission_id=id;return {data:id,error:null};}
  if(name==='private_video_finish'){v.state=args.p_uid?'ready':'uncertain';v.stream_uid=args.p_uid;return {data:true,error:null};}
  if(name==='private_video_recover'){v.state='ready';v.stream_uid=args.p_uid;return {data:true,error:null};}
  if(name==='private_video_hold')return {data:true,error:null};
  return {data:null,error:'invalid'};
 });
 const d:PrivateUploadDependencies={rpc,authenticate:async()=>ws,signPut:vi.fn(async()=> 'https://fixture.invalid/upload'),head:async()=>({bytes:10,etag:'"fixture"'}),
  freezeAndCopy:vi.fn(async(v,_claim,_etag,hold)=>{await hold('__willflow_v2/'+v.workspace_id+'/'+v.operation_id+'/frozen.mp4');return 'a'.repeat(32);}),findAccepted:async()=>[]};
 const request=(action:string,extra:any={})=>privateUpload(new Request('http://localhost/fixture',{method:'POST',body:JSON.stringify({action,operationId:op,...extra})}),d);
 return {v,d,rpc,request};
}
it('new-only upload uses private namespace and derives user from verified auth; process retry does not copy twice',async()=>{
 const f=fixture();expect((await f.request('issue',{workspaceId:ws,projectId:id,fileName:'Vídeo 🎬.mp4',bytes:10,type:'video/mp4',userId:'forged'})).status).toBe(201);
 expect(f.d.signPut).toHaveBeenCalledWith(f.v.object_key,'video/mp4',expect.any(Number));
 expect(f.rpc.mock.calls[0][1].p_user).toBe(ws);
 expect((await f.request('process')).status).toBe(200);expect((await f.request('process')).status).toBe(200);
 expect(f.d.freezeAndCopy).toHaveBeenCalledTimes(1);
 expect(f.rpc.mock.calls.some(x=>x[0].includes('legacy')||x[0]==='add_workspace_storage')).toBe(false);
});
it('mismatched object size cannot persist or call provider',async()=>{
 const f=fixture();f.d.head=async()=>({bytes:11,etag:'fixture'});
 expect((await f.request('process')).status).toBe(409);expect(f.d.freezeAndCopy).not.toHaveBeenCalled();
 expect(f.rpc.mock.calls.map(x=>x[0])).toEqual(['private_video_operation']);
});
it('lost provider response stays uncertain across process retries; recovery requires one exact association',async()=>{
 const f=fixture();f.d.freezeAndCopy=vi.fn(async()=>{throw Error('accepted response lost');});
 expect((await f.request('process')).status).toBe(409);expect(f.v.state).toBe('uncertain');
 expect((await f.request('process')).status).toBe(409);expect(f.d.freezeAndCopy).toHaveBeenCalledTimes(1);
 expect((await f.request('recover')).status).toBe(409);
 f.d.findAccepted=async()=>[{uid:'a'.repeat(32),operation_id:op,workspace_id:ws,version_id:id,key:f.v.object_key}];
 expect((await f.request('recover')).status).toBe(200);expect(f.v.state).toBe('ready');
});
it('ambiguous or cross-workspace provider results cannot recover',async()=>{
 const f=fixture();f.v.state='uncertain';f.v.submission_id=id;
 const match={uid:'a'.repeat(32),operation_id:op,workspace_id:ws,version_id:id,key:f.v.object_key};
 f.d.findAccepted=async()=>[{...match,workspace_id:id}];expect((await f.request('recover')).status).toBe(409);
 f.d.findAccepted=async()=>[match,{...match,uid:'b'.repeat(32)}];expect((await f.request('recover')).status).toBe(409);
 expect(f.rpc.mock.calls.some(x=>x[0]==='private_video_recover')).toBe(false);
});