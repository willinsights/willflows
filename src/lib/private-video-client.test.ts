import {it,expect,vi} from 'vitest';
const invoke=vi.fn();
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>invoke(...args)}}}));
import {uploadPrivateVideo,privateVideoRequest} from './private-video-client';
it('normal upload binds issued identity to process, never writes legacy keys',async()=>{
 invoke.mockReset();invoke.mockResolvedValueOnce({data:{url:'http://localhost/fictitious-put'},error:null}).mockResolvedValueOnce({data:{versionId:'fixture'},error:null});
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('',{status:200}));
 const file=new File(['fixture'],'fixture.mp4',{type:'video/mp4'});
 const result=await uploadPrivateVideo(file,{workspaceId:'ws',projectId:'project',taskId:null},'operation');
 expect(invoke).toHaveBeenNthCalledWith(1,'private-video',{body:{action:'issue',operationId:'operation',workspaceId:'ws',projectId:'project',taskId:null,fileName:'fixture.mp4',bytes:7,type:'video/mp4'}});
 expect(invoke).toHaveBeenNthCalledWith(2,'private-video',{body:{action:'process',operationId:'operation'}});expect(result.versionId).toBe('fixture');fetch.mockRestore();
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
 expect(fetch).not.toHaveBeenCalled();expect(invoke).toHaveBeenNthCalledWith(3,'private-video',{body:{action:'recover',operationId:'same-operation'}});fetch.mockRestore();
});