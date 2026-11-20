import { it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {isolatedObjectKey,assertIsolatedIdentity} from './namespace';
const ws='11111111-1111-4111-8111-111111111111',op='22222222-2222-4222-8222-222222222222';
it('separate key cannot be minted by the legacy workspace-first issuer; tenant identity is exact',()=>{
 const key=isolatedObjectKey(ws,op);
 expect(key.startsWith(ws+'/')).toBe(false);
 assertIsolatedIdentity(key,ws,op);
 expect(()=>assertIsolatedIdentity(key,op,ws)).toThrow('OBJECT_CONTEXT_MISMATCH');
 expect(()=>isolatedObjectKey('../',op)).toThrow('INVALID_IDENTITY');
});
it('actual old cleanup can delete an isolated object before a database fence rejects its update',async()=>{
 const key=isolatedObjectKey(ws,op),uid='fixture-new-stream';
 const external=new Set([key,uid]);let tokenActive=true;let guardedUpdates=0;
 const video={id:op,task_id:op,workspace_id:ws,r2_key:key,cloudflare_stream_uid:uid,file_size_bytes:10,is_deleted:false,file_path:'r2://fixture/'+key};
 const db={from:(table:string)=>{
  const filters:Array<(r:any)=>boolean>=[];let update:any;let single=false;
  const q:any={select:()=>q,eq:(k:string,v:any)=>(filters.push(r=>r[k]===v),q),in:(k:string,v:any[])=>(filters.push(r=>v.includes(r[k])),q),lte:()=>q,gt:()=>{filters.push(()=>false);return q;},lt:()=>q,or:()=>q,limit:()=>q,
   update:(v:any)=>(update=v,q),insert:()=>q,single:()=>(single=true,q),maybeSingle:()=>(single=true,q),
   then:(resolve:any)=>{
    if(update){
     if(table==='video_versions'){guardedUpdates++;return Promise.resolve({data:null,error:{message:'fenced'}}).then(resolve);}
     if(table==='video_approval_tokens')tokenActive=false;
     return Promise.resolve({data:null,error:null}).then(resolve);
    }
    const rows=table==='video_versions'?[video]:table==='video_retention_queue'?[{id:op,task_id:op,workspace_id:ws,status:'pending'}]:table==='workspace_storage'?[{workspace_id:ws,storage_used_bytes:10}]:[];
    const data=rows.filter(r=>filters.every(f=>f(r)));
    return Promise.resolve({data:single?data[0]??null:data,error:null}).then(resolve);
   }};return q;
 }};
 let handler:(req:Request)=>Promise<Response>=async()=>new Response(null,{status:500});
 const source=readFileSync(new URL('../operational/production-2026-11-20/rollback/cleanup-expired-videos.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const fakeFetch=vi.fn(async()=>{external.delete(uid);return new Response('{}',{status:200});});
 const deno={env:{get:(k:string)=>k==='SUPABASE_URL'?'http://localhost/fixture':'fixture-only'}};
 class S3 {async send(command:{Key:string}){external.delete(command.Key);}}
 class Delete {Key:string;constructor(args:{Key:string}){this.Key=args.Key;}}
 new Function('serve','createClient','Deno','S3Client','DeleteObjectCommand','secretEquals','fetch','console',js)(
  (fn:typeof handler)=>{handler=fn;},()=>db,deno,S3,Delete,(a:string,b:string)=>a===b,fakeFetch,{log:()=>{},error:()=>{}});
 const response=await handler(new Request('http://localhost/fixture',{method:'POST',headers:{'x-cron-secret':'fixture-only'}}));
 expect(response.status).toBe(200);expect(guardedUpdates).toBe(1);
 expect(external.has(key)).toBe(false);expect(external.has(uid)).toBe(false);
 expect(video.is_deleted).toBe(false);expect(tokenActive).toBe(false);
 // This is a negative safety proof, not a green production release gate.
});