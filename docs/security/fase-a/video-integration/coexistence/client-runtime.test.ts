import {it,expect,vi} from 'vitest';
import {sidecarRequest} from '../../../../../supabase/functions/private-video/sidecar-handler';
const ws='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222',user='44444444-4444-4444-8444-444444444444';
const req=(b:unknown)=>new Request('http://localhost/fixture',{method:'POST',body:JSON.stringify(b)});
const deps=(signed=true)=>({rpc:vi.fn(async()=>({data:{enabled:true},error:null})),authenticate:async()=>signed?user:null,sign:vi.fn(),ready:vi.fn()});
it('normal context derives caller from verified session, ignoring forged user ids',async()=>{
 const d=deps();const r=await sidecarRequest(req({action:'context',workspaceId:ws,projectId:project,userId:project}),d);
 expect(r.status).toBe(200);expect(d.rpc).toHaveBeenCalledWith('private_video_context',{p_ws:ws,p_project:project,p_task:null,p_user:user});
});
it('signed-out clients cannot enumerate canonical workspace videos',async()=>{
 const d=deps(false);const r=await sidecarRequest(req({action:'client-list',workspaceId:ws}),d);expect(r.status).toBe(401);expect(d.rpc).not.toHaveBeenCalled();
});
it('workspace authorization refusals do not read providers or legacy data',async()=>{
 const d=deps();d.rpc.mockResolvedValue({data:null,error:{message:'Forbidden'}} as never);const r=await sidecarRequest(req({action:'client-list',workspaceId:ws,projectId:project}),d);
 expect(r.status).toBe(403);expect(d.sign).not.toHaveBeenCalled();expect(d.rpc).toHaveBeenCalledTimes(1);
});