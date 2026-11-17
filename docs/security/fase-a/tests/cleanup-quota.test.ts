import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
afterEach(()=>vi.unstubAllGlobals());
async function run(fail: boolean) {
  let handler: (r:Request)=>Promise<Response> = async()=>new Response();
  const rpcCalls: any[]=[];
  vi.stubGlobal('fetch',()=>{throw new Error('Network blocked');});
  const client={from(table:string){let deleted: boolean|undefined; const q:any={
    select:()=>q,eq:(k:string,v:any)=>{if(k==='is_deleted')deleted=v;return q;},lt:()=>q,lte:()=>q,gt:()=>q,in:()=>q,or:()=>q,limit:()=>q,
    update:()=>{throw new Error('Unexpected non-atomic mutation');},
    then(resolve:any){return Promise.resolve({data:table==='projects'?[{id:'project-fixture'}]:table==='video_versions'&&deleted===false?[{id:'video-fixture',workspace_id:'workspace-fixture',file_size_bytes:200,replacement_file_size_bytes:50}]:[],error:null}).then(resolve);}
  };return q;},rpc:async(name:string,p:any)=>{rpcCalls.push({name,p});return {data:250,error:fail?{message:'fictitious failure'}:null};}};
  const source=readFileSync(new URL('../supabase/functions/cleanup-expired-videos/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  new Function('Deno','createClient','S3Client','DeleteObjectCommand','secretEquals','authenticateCronRequest',js)(
    {env:{get:(k:string)=>k==='CLEANUP_DELETIONS_ENABLED'?'true':['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].includes(k)?'fixture-only':undefined},serve:(h:typeof handler)=>{handler=h;}},()=>client,class {},class {},()=>false,()=>null);
  const response=await handler(new Request('http://fixture.invalid',{method:'POST'}));return {response,rpcCalls};
}
it('real cleanup handler uses one atomic RPC, never read-modify-writes storage',async()=>{
  const {response,rpcCalls}=await run(false);expect(response.status).toBe(200);expect(rpcCalls).toEqual([{name:'mark_cleanup_videos_deleted',p:{p_workspace:'workspace-fixture',p_ids:['video-fixture']}}]);expect((await response.json()).deliveredMarked).toBe(1);
});
it('real cleanup reports failure rather than success if atomic persistence fails',async()=>{
  const {response}=await run(true);expect(response.status).toBe(500);expect((await response.json()).success).not.toBe(true);
});
