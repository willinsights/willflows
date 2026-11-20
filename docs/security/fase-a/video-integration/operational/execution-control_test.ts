import { controlled, MaintenanceStop } from './supabase/functions/_shared/execution-control.ts';
const assert=(ok:boolean)=>{if(!ok)throw Error('assertion');};
Deno.test('paused authenticated cleanup has zero effects',async()=>{
 let effects=0;try{await controlled({rpc:async()=>({data:false,error:null})},'cleanup',async()=>{effects++;});throw Error('accepted');}catch(e){assert(e instanceof MaintenanceStop);}assert(effects===0);
});
Deno.test('failure never marks execution drained',async()=>{
 const calls:Array<Record<string,unknown>>=[];
 const db={rpc:async(name:string,args?:Record<string,unknown>)=>{calls.push({name,...args});return{data:true,error:null};}};
 try{await controlled(db,'process',async()=>{throw Error('provider timeout');});}catch{}
 assert(calls.some(c=>c.name==='finish_video_execution'&&c.p_ok===false));
});
Deno.test('uncertain provider result remains held',async()=>{
 const calls:Array<Record<string,unknown>>=[];const db={rpc:async(name:string,args?:Record<string,unknown>)=>{calls.push({name,...args});return{data:true,error:null};}};
 await controlled(db,'cleanup',async lease=>{lease.markUncertain();return true;});assert(calls.some(c=>c.p_ok===false));
});
Deno.test('grant persists before delivery and check precedes effects',async()=>{
 const calls:string[]=[];const db={rpc:async(name:string)=>{calls.push(name);return{data:true,error:null};}};
 await controlled(db,'issue',async lease=>{await lease.grant('2026-11-20T12:00:00Z');await lease.check();calls.push('delivery');});
 assert(calls.indexOf('record_video_grant')<calls.indexOf('delivery'));assert(calls.indexOf('check_video_execution')<calls.indexOf('delivery'));
});
