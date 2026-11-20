import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {sidecarRequest,digestPrivateLink,type SidecarDependencies} from './sidecar-handler';
const ws='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const token='wf2_'+'a'.repeat(64),uid='b'.repeat(32);
async function fixture(){
 const digest=await digestPrivateLink(token);let revoked=false,withdrawn=false;let parent=true;const comments:any[]=[];
 const version={id,workspace_id:ws,project_id:id,task_id:ws,author_id:ws,file_name:'fixture.mp4',bytes:10,object_key:'__willflow_v2/'+ws+'/'+id+'/input.mp4',stream_uid:uid,generation:1,state:'ready',created_at:'2026-11-20T13:00:00Z'};
 const rpc=vi.fn(async(name:string,args:any)=>{
  if(name==='private_video_read'){
   if(args.p_version!==id||revoked||withdrawn||!parent||(!args.p_user&&args.p_digest!==digest))return {data:null,error:'denied'};
   return {data:{version:{...version},comments:[...comments],approval:null},error:null};
  }
  if(name==='private_video_feedback'){comments.push({id:ws,version_id:id,name:args.p_name,body:args.p_body,timestamp_seconds:args.p_timestamp,created_at:'fixture'});return {data:true,error:null};}
  return {data:false,error:'forbidden'};
 });
 const d:SidecarDependencies={rpc,authenticate:async()=>null,ready:async()=>true,sign:vi.fn(async()=>({url:'https://fixture.invalid/signed/manifest/video.m3u8',thumbnail:'https://fixture.invalid/thumb',expiresAt:9999999999}))};
 const request=(body:any)=>sidecarRequest(new Request('http://localhost/private',{method:'POST',body:JSON.stringify(body)}),d);
 return {request,d,rpc,comments,version,revoke:()=>{revoked=true;},withdraw:()=>{withdrawn=true;},removeParent:()=>{parent=false;}};
}
it('new reader signs only the canonical UID and omits keys, UID, author and token digests',async()=>{
 const f=await fixture();const r=await f.request({action:'read',versionId:id,token});expect(r.status).toBe(200);
 const body=await r.json();expect(body.playback.url).toContain('signed');expect(body.version.id).toBe(id);
 const text=JSON.stringify(body);for(const hidden of ['__willflow_v2',uid,'author_id','digest'])expect(text).not.toContain(hidden);
 expect(r.headers.get('cache-control')).toBe('private, no-store');
});
it.each(['revoke','withdraw','removeParent'] as const)('denies signing result if %s occurs during provider call',async action=>{
 const f=await fixture();f.d.sign=async()=>{f[action]();return {url:'secret',thumbnail:'secret',expiresAt:999};};
 const r=await f.request({action:'read',versionId:id,token});expect(r.status).toBe(403);expect(await r.text()).not.toContain('secret');
});
it('superseded generation cannot release playback',async()=>{
 const f=await fixture();f.d.sign=async()=>{f.version.generation++;return {url:'secret',thumbnail:'secret',expiresAt:999};};
 expect((await f.request({action:'read',versionId:id,token})).status).toBe(403);
});
it('rejects old token and forged user ID; member identity comes from verified server auth',async()=>{
 const f=await fixture();expect((await f.request({action:'read',versionId:id,token:'old-fixture'})).status).toBe(403);
 expect((await f.request({action:'read',versionId:id,userId:ws})).status).toBe(401);expect(f.d.sign).not.toHaveBeenCalled();
 f.d.authenticate=async()=>ws;expect((await f.request({action:'read',versionId:id,userId:'attacker'})).status).toBe(200);
 expect(f.rpc).toHaveBeenCalledWith('private_video_read',{p_version:id,p_user:ws,p_digest:null});
});
it('feedback goes only to private RPC; does not write legacy comments, approvals or tokens',async()=>{
 const f=await fixture();const r=await f.request({action:'comment',versionId:id,token,requestId:ws,name:'Fixture',body:'Corte sintético',timestamp:0.5});
 expect(r.status).toBe(201);expect(f.comments).toHaveLength(1);expect(f.comments[0].body).toBe('Corte sintético');
 expect(f.rpc.mock.calls.map(x=>x[0])).toEqual(['private_video_read','private_video_feedback']);
});
it.each(['expired','delivered','orphan'])('actual legacy cleanup %s branch, repeated and delayed, cannot discover or delete private assets or revoke links',async branch=>{
 const key='__willflow_v2/'+ws+'/'+id+'/input.mp4';const assets=new Set([key,uid,'old-key','old-uid','old-replacement-key','old-replacement-uid']);
 const canonical={key,uid,state:'ready',bytes:10};const privateLink={active:true};const legacyLink={active:true};
 const legacyVersion={id:ws,task_id:ws,project_id:id,workspace_id:ws,r2_key:'old-key',cloudflare_stream_uid:'old-uid',replacement_r2_key:'old-replacement-key',replacement_stream_uid:'old-replacement-uid',file_path:'r2://fixture/old-key',file_size_bytes:4,is_deleted:branch==='orphan'};
 const selections:string[]=[];
 const db={from:(table:string)=>{
  let update:any;let single=false;const filters:Array<(r:any)=>boolean>=[];
  const q:any={select:()=>q,eq:(k:string,v:any)=>(filters.push(r=>r[k]===v),q),in:(k:string,v:any[])=>(filters.push(r=>v.includes(r[k])),q),lte:()=>q,gt:()=>(filters.push(()=>false),q),lt:()=>q,or:()=>q,limit:()=>q,insert:()=>q,
   update:(v:any)=>(update=v,q),single:()=>(single=true,q),maybeSingle:()=>(single=true,q),then:(resolve:any)=>{
    if(update){if(table==='video_approval_tokens')legacyLink.active=false;if(table==='video_versions')Object.assign(legacyVersion,update);return Promise.resolve({data:null,error:null}).then(resolve);}
    selections.push(table);
    const rows=table==='video_versions'?[{...legacyVersion}]:table==='video_retention_queue'&&branch==='expired'?[{id:ws,workspace_id:ws,task_id:ws,status:'pending'}]:table==='projects'&&branch==='delivered'?[{id,is_delivered:true}]:table==='workspace_storage'?[{workspace_id:ws,storage_used_bytes:4}]:[];
    const result=rows.filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?result[0]??null:result,error:null}).then(resolve);
   }};return q;
 }};
 const source=readFileSync(new URL('../operational/production-2026-11-20/rollback/cleanup-expired-videos.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 let handler:(r:Request)=>Promise<Response>=async()=>new Response(null,{status:500});
 class S3{async send(c:{Key:string}){assets.delete(c.Key);}}
 class Delete{Key:string;constructor(c:{Key:string}){this.Key=c.Key;}}
 const fetchFixture=vi.fn(async(url:string)=>{assets.delete(url.split('/').pop()??'');return new Response('{}');});
 new Function('serve','createClient','Deno','S3Client','DeleteObjectCommand','secretEquals','fetch','console',js)(
  (fn:typeof handler)=>{handler=fn;},()=>db,{env:{get:()=> 'fixture'}},S3,Delete,(a:string,b:string)=>a===b,fetchFixture,{log:()=>{},error:()=>{}});
 for(let i=0;i<2;i++)expect((await handler(new Request('http://localhost/fixture',{method:'POST',headers:{'x-cron-secret':'fixture'}}))).status).toBe(200);
 expect(assets.has('old-key')).toBe(false);expect(assets.has('old-uid')).toBe(false);
 expect(assets.has('old-replacement-key')).toBe(false);expect(assets.has('old-replacement-uid')).toBe(false);
 expect(assets.has(key)).toBe(true);expect(assets.has(uid)).toBe(true);expect(privateLink.active).toBe(true);
 expect(legacyLink.active).toBe(branch!=='expired');expect(canonical).toEqual({key,uid,state:'ready',bytes:10});
 expect(selections.some(x=>x.includes('private'))).toBe(false);
});

it.each([false, true])('reports individual link revocation only when the database confirms it (%s)', async revoked => {
 const f=await fixture();
 f.d.authenticate=async()=>ws;
 f.rpc.mockResolvedValueOnce({data:revoked,error:null});
 const result=await f.request({action:'revoke',token});
 expect(result.status).toBe(revoked?200:403);
 expect(f.rpc).toHaveBeenCalledWith('private_video_revoke',{p_digest:await digestPrivateLink(token),p_user:ws});
});
