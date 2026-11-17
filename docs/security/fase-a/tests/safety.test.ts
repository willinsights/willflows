import { afterEach, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
afterEach(()=>vi.unstubAllGlobals());
function load(path:string, injections:Record<string,unknown>){
  const source=readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import .*\n/gm,'');
  new Function(...Object.keys(injections),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(injections));
}
it('cleanup disabled by default performs no DB/storage access or deletion',async()=>{
  let handler:(r:Request)=>Promise<Response>=async()=>new Response();
  const create=vi.fn(()=>{throw new Error('DB access forbidden');});
  vi.stubGlobal('fetch',()=>{throw new Error('Network forbidden');});
  load('../supabase/functions/cleanup-expired-videos/index.ts',{
    Deno:{env:{get:()=>undefined},serve:(h:typeof handler)=>{handler=h;}},createClient:create,S3Client:class {},DeleteObjectCommand:class {},secretEquals:()=>false,authenticateCronRequest:()=>null,
  });
  const response=await handler(new Request('http://fixture.invalid'));
  expect(response.status).toBe(503);expect((await response.json()).paused).toBe(true);expect(create).not.toHaveBeenCalled();
});
it('cleanup missing provider credentials retains all orphan references for recovery',async()=>{
  let handler:(r:Request)=>Promise<Response>=async()=>new Response();
  const writes:unknown[]=[];
  const client={from(table:string){let deleted=false;const q:any={select:()=>q,eq:(k:string,v:unknown)=>{if(k==='is_deleted')deleted=v===true;return q;},in:()=>q,lte:()=>q,gt:()=>q,lt:()=>q,or:()=>q,limit:()=>q,
    update:(p:unknown)=>{writes.push(p);return q;},then(resolve:any){return Promise.resolve({data:table==='video_versions'&&deleted?[{id:'fixture',r2_key:'fixture/key',cloudflare_stream_uid:'fixture-uid'}]:[],error:null}).then(resolve);}};return q;}};
  vi.stubGlobal('fetch',()=>{throw new Error('Network forbidden');});
  load('../supabase/functions/cleanup-expired-videos/index.ts',{
    Deno:{env:{get:(k:string)=>k==='CLEANUP_DELETIONS_ENABLED'?'true':['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].includes(k)?'fixture':undefined},serve:(h:typeof handler)=>{handler=h;}},createClient:()=>client,S3Client:class {},DeleteObjectCommand:class {},secretEquals:()=>false,authenticateCronRequest:()=>null,
  });
  const response=await handler(new Request('http://fixture.invalid'));const result=await response.json();
  expect(result.orphanFailures).toBe(1);expect(result.orphanedCleaned).toBe(0);expect(writes).toEqual([]);
});
it('Stripe status equivalence covers canceled/trial variants without equating an unpaid active account',()=>{
  const source=readFileSync(new URL('../../../../supabase/functions/stripe-reconcile/index.ts',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function statusesMatch'),source.indexOf('Deno.serve'));
  const matches=new Function(ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'; return statusesMatch;')() as (a:string,b:string)=>boolean;
  expect(matches('trialing','trial')).toBe(true);expect(matches('canceled','cancelled')).toBe(true);
  expect(matches('unpaid','past_due')).toBe(true);expect(matches('active','past_due')).toBe(false);expect(matches('active','')).toBe(false);
});
it('real Stripe reconciliation handler with matching fixtures retrieves only; never changes payments or sends',async()=>{
  let handler:(r:Request)=>Promise<Response>=async()=>new Response();let retrieved=0;
  const client={from(table:string){if(table!=='user_subscriptions')throw new Error('Unexpected table access');const q:any={select:()=>q,not:()=>q,then(resolve:any){return Promise.resolve({data:[{stripe_subscription_id:'sub_fixture',subscription_status:'active'}],error:null}).then(resolve);}};return q;},functions:{invoke:()=>{throw new Error('No sends permitted');}}};
  vi.stubGlobal('fetch',()=>{throw new Error('External network forbidden');});
  load('../../../../supabase/functions/stripe-reconcile/index.ts',{
    Deno:{env:{get:()=> 'fixture'},serve:(h:typeof handler)=>{handler=h;}},createClient:()=>client,
    Stripe:class {subscriptions={retrieve:async(id:string)=>{expect(id).toBe('sub_fixture');retrieved++;return {status:'active'};}};},secretEquals:()=>true,authenticateCronRequest:()=>null,
  });
  const response=await handler(new Request('http://fixture.invalid',{method:'POST',body:JSON.stringify({notify:false})}));
  expect(response.status).toBe(200);expect(await response.json()).toEqual({success:true,checked:1,errors:0,discrepancies:0,inserted:0});expect(retrieved).toBe(1);
});