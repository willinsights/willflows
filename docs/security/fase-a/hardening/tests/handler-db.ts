// PostgreSQL fixture integration; environment must name the private Unix socket.
import postgres from 'postgres';
import { deliverPush } from '../supabase/functions/_shared/push-delivery';
import { withSafeCron } from '../supabase/functions/_shared/safe-cron';
import assert from 'node:assert/strict';
const socket=process.env.FIXTURE_SOCKET;
if(!socket?.startsWith('/tmp/fase-a-hardening-'))throw new Error('Private fixture required');
const db=postgres({host:socket,port:55448,user:'fixture',database:'postgres',max:12});
globalThis.fetch=async()=>{throw new Error('External network blocked');};
let sends=0,ambiguous=false;
const qid='44444444-4444-4444-8444-444444444444';
const client={from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:{push_enabled:true,push_subscription:{endpoint:'https://fixture.invalid',keys:{p256dh:'fake',auth:'fake'}}}};}}),async rpc(name:string,p:any){try{return {data:await db.begin(async sql=>{
  await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`;
  if(name==='claim_push_delivery')return (await sql`SELECT claim_push_delivery(${p.p_id}::uuid) r`)[0].r;
  if(name==='finish_push_delivery')return (await sql`SELECT finish_push_delivery(${p.p_id}::uuid,${p.p_token}::uuid,${p.p_state}) r`)[0].r;
  if(name==='claim_safe_cron')return (await sql`SELECT claim_safe_cron(${p.p_handler}) r`)[0].r;
  if(name==='finish_safe_cron')return (await sql`SELECT finish_safe_cron(${p.p_handler},${p.p_token}::uuid,${p.p_uncertain}) r`)[0].r;
  throw new Error('Unexpected RPC');
})};}catch{return {error:{message:'Fixture failure'}};}}};
const send=async()=>{sends++;await new Promise(r=>setTimeout(r,20));if(ambiguous)throw new Error('Fixture timeout');};
try{
 await db`INSERT INTO push_notification_queue(id) VALUES(${qid}::uuid)`;
 const states=await Promise.all(Array.from({length:8},()=>deliverPush(client,{id:qid,user_id:'fixture'},send)));
 assert.equal(sends,1);assert.equal(states.filter(s=>s==='sent').length,1);
 assert.equal((await db`SELECT status FROM push_notification_queue WHERE id=${qid}::uuid`)[0].status,'sent');
 console.log('PASS push delivery code + real SQL: 8 callers, 1 fictitious provider call, persisted sent');
 const other='55555555-5555-4555-8555-555555555555';await db`INSERT INTO push_notification_queue(id) VALUES(${other}::uuid)`;ambiguous=true;
 await deliverPush(client,{id:other,user_id:'fixture'},send);await deliverPush(client,{id:other,user_id:'fixture'},send);
 assert.equal(sends,2);assert.equal((await db`SELECT state FROM push_delivery_claims WHERE queue_id=${other}::uuid`)[0].state,'uncertain');
 console.log('PASS push timeout persisted uncertain and second provider call blocked');
 await db`UPDATE safe_cron_runs SET state='idle' WHERE handler='check-deadlines'`; // fixture recovery only
 let work=0;
 const responses=await Promise.all(Array.from({length:8},()=>withSafeCron(client,'check-deadlines',async()=>{work++;await new Promise(r=>setTimeout(r,80));return new Response();})));
 assert.equal(work,1);assert.equal(responses.filter(r=>r.status===200).length,1);
 console.log('PASS cron wrapper + SQL: 8 callers run work once');
}finally{await db.end();}