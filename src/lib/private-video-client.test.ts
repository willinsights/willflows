import {it,expect,vi,beforeEach} from 'vitest';
const invoke=vi.fn();
const {getSession,refreshSession}=vi.hoisted(()=>({getSession:vi.fn(),refreshSession:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession,refreshSession},functions:{invoke:(...args:unknown[])=>invoke(...args)}}}));
import {uploadPrivateVideo,privateVideoRequest} from './private-video-client';
beforeEach(()=>{getSession.mockReset().mockResolvedValue({data:{session:{access_token:'fixture-token'}},error:null});refreshSession.mockReset();});
it('normal upload binds issued identity to process, never writes legacy keys',async()=>{
 invoke.mockReset();invoke.mockResolvedValueOnce({data:{url:'http://localhost/fictitious-put'},error:null}).mockResolvedValueOnce({data:{versionId:'fixture'},error:null});
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('',{status:200}));
 const file=new File(['fixture'],'fixture.mp4',{type:'video/mp4'});
 const result=await uploadPrivateVideo(file,{workspaceId:'ws',projectId:'project',taskId:null},'operation');
 expect(invoke).toHaveBeenNthCalledWith(1,'private-video',{body:{action:'issue',operationId:'operation',workspaceId:'ws',projectId:'project',taskId:null,fileName:'fixture.mp4',bytes:7,type:'video/mp4'},headers:{Authorization:'Bearer fixture-token'}});
 expect(invoke).toHaveBeenNthCalledWith(2,'private-video',{body:{action:'process',operationId:'operation'},headers:{Authorization:'Bearer fixture-token'}});expect(result.versionId).toBe('fixture');fetch.mockRestore();
});
it('failed object upload never starts processing',async()=>{
 invoke.mockReset();invoke.mockResolvedValue({data:{url:'http://localhost/fictitious-put'},error:null});
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('',{status:500}));
 await expect(uploadPrivateVideo(new File(['x'],'f.mp4',{type:'video/mp4'}),{workspaceId:'ws',projectId:'p',taskId:null},'op')).rejects.toThrow();expect(invoke).toHaveBeenCalledTimes(1);fetch.mockRestore();
});
it('private failures do not fall back to legacy',async()=>{
 invoke.mockReset();invoke.mockResolvedValue({data:{code:'DENIED'},error:null});await expect(privateVideoRequest({action:'context'})).rejects.toThrow();expect(invoke).toHaveBeenCalledTimes(1);
});
it('retry of persisted upload does not upload again and reconciles only the exact uncertain operation',async()=>{
 invoke.mockReset();invoke.mockResolvedValueOnce({data:{code:'EXPIRED_OR_ALREADY_PERSISTED'}}).mockResolvedValueOnce({data:{code:'PROVIDER_UNCERTAIN'}}).mockResolvedValueOnce({data:{versionId:'ready'}});
 const fetch=vi.spyOn(globalThis,'fetch');await uploadPrivateVideo(new File(['x'],'f.mp4',{type:'video/mp4'}),{workspaceId:'ws',projectId:'p',taskId:null},'same-operation');
 expect(fetch).not.toHaveBeenCalled();expect(invoke).toHaveBeenNthCalledWith(3,'private-video',{body:{action:'recover',operationId:'same-operation'},headers:{Authorization:'Bearer fixture-token'}});fetch.mockRestore();
});
it('renews a rejected session once and sends the renewed token explicitly',async()=>{
 invoke.mockReset().mockResolvedValueOnce({data:null,error:{context:new Response('{"code":"UNAUTHORIZED"}',{status:401})}}).mockResolvedValueOnce({data:{versions:[{id:'real-result'}]},error:null});
 refreshSession.mockResolvedValue({data:{session:{access_token:'renewed-fixture'}},error:null});
 expect(await privateVideoRequest({action:'client-list'})).toEqual({versions:[{id:'real-result'}]});
 expect(refreshSession).toHaveBeenCalledTimes(1);
 expect(invoke).toHaveBeenLastCalledWith('private-video',{body:{action:'client-list'},headers:{Authorization:'Bearer renewed-fixture'}});
});
it('does not send authenticated requests without a session',async()=>{
 invoke.mockReset();getSession.mockResolvedValue({data:{session:null},error:null});
 await expect(privateVideoRequest({action:'usage'})).rejects.toMatchObject({code:'UNAUTHORIZED'});
 expect(invoke).not.toHaveBeenCalled();
});
it('keeps capability-authorized public approval available without a session',async()=>{
 invoke.mockReset().mockResolvedValue({data:{versions:[]},error:null});getSession.mockResolvedValue({data:{session:null},error:null});
 await expect(privateVideoRequest({action:'list',token:'wf2_'+'a'.repeat(64)})).resolves.toEqual({versions:[]});
 expect(refreshSession).not.toHaveBeenCalled();
});
it('never retries permission refusals or loops on a second unauthorized response',async()=>{
 invoke.mockReset().mockResolvedValue({data:null,error:{context:new Response('{"code":"UNAUTHORIZED"}',{status:401})}});
 refreshSession.mockResolvedValue({data:{session:{access_token:'renewed-fixture'}},error:null});
 await expect(privateVideoRequest({action:'usage'})).rejects.toMatchObject({code:'UNAUTHORIZED'});
 expect(invoke).toHaveBeenCalledTimes(2);expect(refreshSession).toHaveBeenCalledTimes(1);
 invoke.mockReset().mockResolvedValue({data:null,error:{context:new Response('{"code":"FORBIDDEN"}',{status:403})}});refreshSession.mockClear();
 await expect(privateVideoRequest({action:'usage'})).rejects.toMatchObject({code:'FORBIDDEN'});
 expect(invoke).toHaveBeenCalledTimes(1);expect(refreshSession).not.toHaveBeenCalled();
});