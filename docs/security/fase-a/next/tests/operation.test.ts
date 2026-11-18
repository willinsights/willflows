import { expect,it,vi } from 'vitest';
import { processDurableUpload } from '../video-operation';
import {signOperation,verifyOperation} from '../operation-ticket';
it('eight copies share one persisted identity and invoke provider once',async()=>{
  let claimed=false;const copy=vi.fn(async()=> 'uid-fixture');
  const client={rpc:async(name:string)=>name==='persist_video_operation'?{data:{version_id:'fixture'}}:name==='claim_video_submission'?(claimed?{data:null}:(claimed=true,{data:'token'})):{} };
  await Promise.all(Array.from({length:8},()=>processDurableUpload(client,'op','user','bucket',copy)));
  expect(copy).toHaveBeenCalledTimes(1);
});
it('uncertain external acceptance stays blocked without automatic resubmit',async()=>{
  let claimed=false;const states:any[]=[];const copy=vi.fn(async()=>{throw new Error('timeout');});
  const client={rpc:async(name:string,p:any)=>{if(name==='persist_video_operation')return {data:{version_id:'fixture'}};if(name==='claim_video_submission')return claimed?{data:null}:(claimed=true,{data:'token'});states.push(p);return {};}};
  await expect(processDurableUpload(client,'op','user','bucket',copy)).rejects.toThrow('uncertain');
  await processDurableUpload(client,'op','user','bucket',copy);expect(copy).toHaveBeenCalledTimes(1);expect(states[0].p_uid).toBeNull();
});
it('persistence rejection never reaches external provider',async()=>{
  const copy=vi.fn();await expect(processDurableUpload({rpc:async()=>({error:{}})},'op','user','bucket',copy)).rejects.toThrow();expect(copy).not.toHaveBeenCalled();
});
it('signed Unicode operation cannot change identity or context and expires',async()=>{
 const t={operation_id:'fixture-op',user_id:'fixture-user',workspace_id:'fixture-ws',project_id:'fixture-project',task_id:null,key:'fixture-key',file_name:'Corte – ação 🎬.mp4',file_size:100,replace_version_id:null,expires_at:2000};
 const ticket=await signOperation(t,'fictitious-secret');expect(await verifyOperation(ticket,t,'fictitious-secret',1000)).toEqual(t);
 await expect(verifyOperation(ticket,{...t,operation_id:'different'},'fictitious-secret',1000)).rejects.toThrow('mismatch');
 await expect(verifyOperation(ticket,t,'fictitious-secret',2000)).rejects.toThrow('expired');
});