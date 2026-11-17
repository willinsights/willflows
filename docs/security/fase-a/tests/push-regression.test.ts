import { expect, it, vi, afterEach } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
afterEach(()=>vi.unstubAllGlobals());
it('documents current push race: two real handlers can send the same pending fixture twice',async()=>{
  let handler:(r:Request)=>Promise<Response>=async()=>new Response();let sends=0;
  const client={from(table:string){let single=false;const q:any={select:()=>q,eq:()=>q,lt:()=>q,order:()=>q,limit:()=>q,update:()=>q,maybeSingle:()=>{single=true;return q;},then(resolve:any){return Promise.resolve({data:table==='push_notification_queue'?[{id:'fixture',user_id:'fixture-user',title:'Fixture',body:'Fixture',attempts:0}]:single?{push_enabled:true,push_subscription:{endpoint:'https://fixture.invalid',keys:{p256dh:'fake',auth:'fake'}}}:[],error:null}).then(resolve);}};return q;}};
  vi.stubGlobal('fetch',()=>{throw new Error('External network blocked');});
  const source=readFileSync(new URL('../../../../supabase/functions/process-push-queue/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
  new Function('Deno','createClient','webpush','secretEquals',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(
    {env:{get:()=> 'fixture'},serve:(h:typeof handler)=>{handler=h;}},()=>client,
    {setVapidDetails:()=>{},sendNotification:async()=>{sends++;await new Promise(resolve=>setTimeout(resolve,10));}},()=>true);
  const responses=await Promise.all([handler(new Request('http://fixture.invalid')),handler(new Request('http://fixture.invalid'))]);
  expect(responses.map(r=>r.status)).toEqual([200,200]);expect(sends).toBe(2);
});