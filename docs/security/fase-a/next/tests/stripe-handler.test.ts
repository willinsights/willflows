import { expect, it, vi, afterEach } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
afterEach(()=>vi.unstubAllGlobals());
it('real staged Stripe handler uses exact subscription association and preserves enrichment without external writes',async()=>{
  let handler:(r:Request)=>Promise<Response>=async()=>new Response();
  const observations:any[]=[];let reads=0;
  const client={from(table:string){
    const rows:Record<string,unknown[]>={user_subscriptions:[{user_id:'user-fixture',stripe_subscription_id:'sub_fixture',stripe_customer_id:'cus_fixture',subscription_status:'active'}],profiles:[{id:'user-fixture',email:'fixture@example.invalid'}],workspaces:[{id:'ws-fixture',name:'Fixture',stripe_subscription_id:'sub_fixture'}]};
    if(!(table in rows))throw new Error('Unexpected table');
    const q:any={select:(fields:string)=>{expect(fields).not.toContain('owner_id');return q;},not:()=>q,in:(field:string,values:string[])=>{if(table==='workspaces'){expect(field).toBe('stripe_subscription_id');expect(values).toEqual(['sub_fixture']);}return q;},then:(resolve:any)=>Promise.resolve({data:rows[table],error:null}).then(resolve)};return q;
  },rpc:async(name:string,p:any)=>{expect(name).toBe('record_stripe_discrepancy');observations.push(p);return {data:true};},functions:{invoke:()=>{throw new Error('Sending forbidden');}}};
  vi.stubGlobal('fetch',()=>{throw new Error('External network blocked');});
  const source=readFileSync(new URL('../stripe-minimal/supabase/functions/stripe-reconcile/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
  const inject={Deno:{env:{get:()=> 'fixture'},serve:(h:typeof handler)=>{handler=h;}},corsHeaders:{},createClient:()=>client,secretEquals:()=>true,authenticateCronRequest:()=>null,withSafeCron:async(_c:any,_h:string,work:()=>Promise<Response>)=>work(),Stripe:class {subscriptions={retrieve:async()=>{reads++;return {status:'past_due'};}};}};
  new Function(...Object.keys(inject),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(inject));
  const response=await handler(new Request('http://fixture.invalid',{method:'POST',body:'{"notify":true}'}));
  expect(response.status).toBe(200);expect(reads).toBe(1);expect(observations).toEqual([{p_subscription:'sub_fixture',p_stripe_status:'past_due',p_db_status:'active',p_user:'user-fixture',p_customer:'cus_fixture',p_details:{detail:'Status mismatch (stripe=past_due, db=active)',user_email:'fixture@example.invalid',workspace_name:'Fixture'}}]);
});