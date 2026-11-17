import { expect, it } from 'vitest';
import { deliverPush } from '../supabase/functions/_shared/push-delivery';
import { withSafeCron } from '../supabase/functions/_shared/safe-cron';
function fixture(mode='sent') {
  let state:string|undefined,attempts=0,sends=0,failFinish=false;
  const client={rpc:async(name:string,p:any)=>{
    if(name==='claim_push_delivery') {if(state&&state!=='retry')return {data:null};state='reserved';attempts++;return {data:'token'};}
    if(failFinish)return {error:{message:'fixture'}};
    state=p.p_state;return {error:null};
  },from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return mode==='read-failure'?{error:{message:'fixture'}}:{data:{push_enabled:mode!=='disabled',push_subscription:{endpoint:'https://fixture.invalid',keys:{p256dh:'fake',auth:'fake'}}}};}})};
  const send=async()=>{sends++;if(mode==='timeout')throw new Error('fixture timeout');if(mode==='429')throw {statusCode:429};if(mode==='410')throw {statusCode:410};};
  return {client,send,counts:()=>({state,attempts,sends}),fail:()=>{failFinish=true;}};
}
const row={id:'fixture',user_id:'fixture-user',title:'Fixture',body:'Fixture'};
it('8 concurrent deliveries invoke fictitious provider once',async()=>{const f=fixture();await Promise.all(Array.from({length:8},()=>deliverPush(f.client,row,f.send)));expect(f.counts()).toEqual({state:'sent',attempts:1,sends:1});});
it('ambiguous timeout becomes uncertain and never resends',async()=>{const f=fixture('timeout');expect(await deliverPush(f.client,row,f.send)).toBe('uncertain');await deliverPush(f.client,row,f.send);expect(f.counts().sends).toBe(1);});
it('429 explicit rejection permits a safe later retry',async()=>{const f=fixture('429');expect(await deliverPush(f.client,row,f.send)).toBe('retry');});
it('410 expired endpoint is terminal, no automatic preference mutation',async()=>{const f=fixture('410');await deliverPush(f.client,row,f.send);await deliverPush(f.client,row,f.send);expect(f.counts()).toEqual({state:'failed',attempts:1,sends:1});});
it('pre-provider read failure permits retry without sending',async()=>{const f=fixture('read-failure');expect(await deliverPush(f.client,row,f.send)).toBe('retry');expect(f.counts().sends).toBe(0);});
it('disabled preference skips without provider call',async()=>{const f=fixture('disabled');expect(await deliverPush(f.client,row,f.send)).toBe('skipped');expect(f.counts().sends).toBe(0);});
it('failed completion retains ownership and prevents second provider call',async()=>{const f=fixture();f.fail();await expect(deliverPush(f.client,row,f.send)).rejects.toThrow();await deliverPush(f.client,row,f.send);expect(f.counts().sends).toBe(1);expect(f.counts().state).toBe('reserved');});
it('cron exception persists uncertain rather than permitting overlap',async()=>{let reserved=false,finished:any;const client={rpc:async(name:string,p:any)=>{if(name==='claim_safe_cron'){if(reserved)return {data:null};reserved=true;return {data:'token'};}finished=p;return {};}};await expect(withSafeCron(client,'check-deadlines',async()=>{throw new Error('fixture');})).rejects.toThrow();expect(finished.p_uncertain).toBe(true);expect((await withSafeCron(client,'check-deadlines',async()=>new Response())).status).toBe(409);});