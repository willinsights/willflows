// Invoked only by postgres_concurrency.py with its private Unix socket.
import postgres from 'postgres';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import assert from 'node:assert/strict';
const socket = process.env.FASE_A_FIXTURE_SOCKET;
if (!socket?.startsWith('/tmp/fase-a-pg-')) throw new Error('Private fixture socket required');
const db=postgres({host:socket,port:55449,user:'fixture',database:'postgres',max:12});
globalThis.fetch=async()=>{throw new Error('External network blocked');};
const ws='11111111-1111-4111-8111-111111111111',user='77777777-7777-4777-8777-777777777777';
let sends=0, ambiguous=false, finishFailure=false;
const client={from(table:string){let single=false;const q:any={
  select:()=>q,eq:()=>q,in:()=>q,gte:()=>q,lte:()=>q,lt:()=>q,
  single:()=>{single=true;return q;},maybeSingle:()=>{single=true;return q;},
  then(resolve:any){const row=table==='workspaces'?{id:ws,name:'Fixture'}:table==='workspace_members'?{user_id:user}:
    table==='profiles'?{email:'test@example.invalid',full_name:'Fixture'}:{email_weekly_summary:true};
    return Promise.resolve({data:single?row:[row],count:0,error:null}).then(resolve);}
};return q;},async rpc(name:string,p:any){
  if(name==='get_monthly_summary')return {data:[],error:null};
  if(finishFailure&&name==='finish_weekly_summary_delivery')return {data:null,error:{message:'fixture persistence failure'}};
  try {const value=await db.begin(async sql=>{
    await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`;
    if(name==='claim_weekly_summary_delivery')return (await sql`SELECT public.claim_weekly_summary_delivery(${p.p_workspace}::uuid,${p.p_user}::uuid,${p.p_week}::date) AS result`)[0].result;
    if(name==='finish_weekly_summary_delivery')return (await sql`SELECT public.finish_weekly_summary_delivery(${p.p_workspace}::uuid,${p.p_user}::uuid,${p.p_week}::date,${p.p_status}) AS result`)[0].result;
    throw new Error('Unexpected RPC');
  });return {data:value,error:null};}catch{return {data:null,error:{message:'fixture database failure'}};}
},functions:{async invoke(){sends++;await new Promise(resolve=>setTimeout(resolve,20));return ambiguous?{data:null,error:{message:'fixture ambiguous response'}}:{data:{success:true,sent:true},error:null};}}};
let handler:(req:Request)=>Promise<Response>=async()=>new Response();
const source=readFileSync(new URL('../supabase/functions/send-weekly-summary/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
new Function('Deno','createClient','format','subDays','startOfWeek','endOfWeek','secretEquals','authenticateCronRequest',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(
  {env:{get:()=> 'fixture'},serve:(h:typeof handler)=>{handler=h;}},()=>client,format,subDays,startOfWeek,endOfWeek,()=>true,()=>null);
const run=()=>handler(new Request('http://fixture.invalid',{method:'POST'}));
try {
  await db`DELETE FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`;
  const responses=await Promise.all(Array.from({length:8},run));
  assert.equal(sends,1);assert(responses.every(r=>r.status===200));
  assert.equal((await db`SELECT status FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`)[0].status,'sent');
  console.log('PASS real weekly handler + PostgreSQL: 8 requests, 1 fictitious email, persisted sent');
  // Fixture-only reset to exercise distinct failures, never a production recovery procedure.
  await db`DELETE FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`;ambiguous=true;
  assert.equal((await run()).status,500);ambiguous=false;await run();assert.equal(sends,2);
  assert.equal((await db`SELECT status FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`)[0].status,'uncertain');
  console.log('PASS real handler + PostgreSQL: ambiguous acceptance retained, retry blocked');
  await db`DELETE FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`;finishFailure=true;
  assert.equal((await run()).status,500);finishFailure=false;await run();assert.equal(sends,3);
  assert.equal((await db`SELECT status FROM weekly_summary_deliveries WHERE user_id=${user}::uuid`)[0].status,'reserved');
  console.log('PASS real handler + PostgreSQL: completion failure retained, retry blocked');
}finally{await db.end();}