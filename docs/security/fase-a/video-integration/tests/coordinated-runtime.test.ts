import { it, expect, vi } from 'vitest';
import { uploadHandlers } from '../supabase/functions/_shared/integrated-upload';
import { controlled } from '../supabase/functions/_shared/execution-control';
const user='33333333-3333-4333-8333-333333333333',ws='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222';
const request=new Request('http://localhost/fixture');
function fixture(){
 let paused=false,frozen=false;const calls:string[]=[];
 const db={rpc:vi.fn(async(name:string,args:any)=>{
  calls.push(name);
  if(name==='begin_video_execution')return {data:!frozen&&!(paused&&args.p_kind==='issue')};
  if(name==='issue_video_operation')return {data:{id:args.p_id,user_id:user,workspace_id:ws,project_id:project,task_id:null,object_key:args.p_key,file_name:args.p_name,file_size:args.p_size,replace_id:null,expires_at:new Date(Date.now()+7200000).toISOString(),state:'issued'}};
  if(name==='abort_video_operation')return {data:{state:'aborted'}};
  return {data:true};
 }),from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='projects'?{id:project,workspace_id:ws}:table==='workspace_members'?{role:'edicao',is_active:true}:null})};return q;}};
 const signPut=vi.fn(async()=>{calls.push('signPut');return 'http://localhost/fixture-object';});
 const handlers=uploadHandlers({db,coordinated:true,secret:'fictitious',bucket:'fixture',authenticate:async()=>user,signPut,head:vi.fn(),copy:vi.fn(),findAccepted:vi.fn()});
 const body={workspaceId:ws,projectId:project,fileName:'ensaio.mp4',fileSize:10};
 return {db,calls,handlers,body,signPut,pause:()=>{paused=true;},freeze:()=>{frozen=true;},resume:()=>{paused=false;frozen=false;}};
}
it('records the two-hour grant plus 60-second skew before returning a signed PUT',async()=>{
 const f=fixture();const before=Date.now();await f.handlers.issue(request,f.body);
 expect(f.calls.indexOf('record_video_grant')).toBeLessThan(f.calls.indexOf('signPut'));
 const grant=f.db.rpc.mock.calls.find(([name])=>name==='record_video_grant');
 expect(Date.parse(grant?.[1].p_expires)-before).toBeGreaterThanOrEqual(7259000);
 expect(f.db.rpc.mock.calls.at(-1)?.[1].p_ok).toBe(true);
});
it('pause refuses issuance without operation/PUT but permits abort; freeze refuses both; resume restores',async()=>{
 const f=fixture();f.pause();await expect(f.handlers.issue(request,f.body)).rejects.toThrow('VIDEO_MAINTENANCE');
 expect(f.signPut).not.toHaveBeenCalled();expect(f.calls).not.toContain('issue_video_operation');
 expect(await f.handlers.abort(request,{operationId:crypto.randomUUID()})).toEqual({state:'aborted'});
 f.freeze();await expect(f.handlers.abort(request,{operationId:crypto.randomUUID()})).rejects.toThrow('VIDEO_MAINTENANCE');
 f.resume();await f.handlers.issue(request,f.body);expect(f.signPut).toHaveBeenCalledTimes(1);
});
it.each(['process','abort','recover'] as const)('registers %s during drain and permanently retains unconfirmed work',async kind=>{
 const calls:any[]=[];const db={rpc:async(name:string,args:any)=>{calls.push({name,...args});return {data:true,error:null};}};
 await expect(controlled(db,kind,async lease=>{await lease.check();throw Error('unconfirmed');})).rejects.toThrow('unconfirmed');
 expect(calls[0].p_kind).toBe(kind);expect(calls.at(-1).p_ok).toBe(false);
});
it('expired execution prevents later effects and never reports completion',async()=>{
 const effects=vi.fn();const calls:any[]=[];const db={rpc:async(name:string,args:any)=>{calls.push({name,...args});return {data:name!=='check_video_execution',error:null};}};
 await expect(controlled(db,'process',async lease=>{await lease.check();effects();})).rejects.toThrow('VIDEO_MAINTENANCE');
 expect(effects).not.toHaveBeenCalled();expect(calls.at(-1).p_ok).toBe(false);
});