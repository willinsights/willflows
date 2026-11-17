import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
let handler: (r: Request) => Promise<Response>;
let calls: number, failed: boolean, completionFailed: boolean, suppressed: boolean;
let ledger: Map<string,string>;
const ws='11111111-1111-4111-8111-111111111111', user='22222222-2222-4222-8222-222222222222';
beforeEach(() => {
  calls=0; failed=false; completionFailed=false; suppressed=false; ledger=new Map();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
  vi.stubGlobal('fetch', () => { throw new Error('External network blocked'); });
  const client = { from(table: string) {
    let single=false;
    const q: any={ select:()=>q, eq:()=>q, in:()=>q, gte:()=>q,lte:()=>q,lt:()=>q,
      single:()=>{single=true;return q;},maybeSingle:()=>{single=true;return q;},
      then(resolve: any) {
        const row = table==='workspaces'?{id:ws,name:'Fictício'}:table==='workspace_members'?{user_id:user}:
          table==='profiles'?{email:'person@example.invalid',full_name:'Fictício'}:{};
        return Promise.resolve({data:single?row:[row],count:0,error:null}).then(resolve);
      }};return q;
  },rpc:async(name: string,p: any)=>{
    const key=JSON.stringify([p.p_workspace,p.p_user,p.p_week]);
    if(name==='get_monthly_summary') return {data:[],error:null};
    if(name==='claim_weekly_summary_delivery') {
      if(ledger.has(key)) return {data:false,error:null};
      ledger.set(key,'reserved');return {data:true,error:null};
    }
    if(completionFailed) return {error:{message:'fictitious completion failure'}};
    ledger.set(key,p.p_status);return {error:null};
  },functions:{invoke:async()=>{calls++;return failed?{data:null,error:{message:'fictitious timeout'}}:
    {data:{success:true,sent:!suppressed,suppressed},error:null};}}};
  const source=readFileSync(new URL('../supabase/functions/send-weekly-summary/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  new Function('Deno','createClient','format','subDays','startOfWeek','endOfWeek','secretEquals','authenticateCronRequest',js)(
    {env:{get:()=> 'fixture-only'},serve:(h:typeof handler)=>{handler=h;}},()=>client,format,subDays,startOfWeek,endOfWeek,
    (a:string,b:string)=>!!a&&a===b,()=>null);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const run=()=>handler(new Request('http://fixture.invalid',{method:'POST'}));
it('two simultaneous real handlers send one weekly email',async()=>{
  const responses=await Promise.all([run(),run()]);expect(responses.map(r=>r.status)).toEqual([200,200]);expect(calls).toBe(1);
});
it('sequential repetition never resends',async()=>{await run();await run();expect(calls).toBe(1);expect([...ledger.values()]).toEqual(['sent']);});
it('ambiguous failure is not reported as sent and never automatically retried',async()=>{
  failed=true;expect((await run()).status).toBe(500);failed=false;await run();expect(calls).toBe(1);expect([...ledger.values()]).toEqual(['uncertain']);
});
it('completion failure keeps the reservation and prevents a second send',async()=>{
  completionFailed=true;expect((await run()).status).toBe(500);completionFailed=false;await run();expect(calls).toBe(1);expect([...ledger.values()]).toEqual(['reserved']);
});
it('suppressed recipient is terminal without counting a sent email',async()=>{
  suppressed=true;expect((await (await run()).json()).emails_sent).toBe(0);await run();expect(calls).toBe(1);expect([...ledger.values()]).toEqual(['suppressed']);
});
it('next week is a distinct legitimate delivery',async()=>{await run();vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));await run();expect(calls).toBe(2);expect(ledger.size).toBe(2);});
