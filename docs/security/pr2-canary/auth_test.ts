import { authorizeCanary } from './auth.ts';
const id='14956926-b283-487e-8a32-5438b1651843';
const request=(headers:Record<string,string>,body='{}')=>new Request('http://localhost',{method:'POST',headers,body});
Deno.test('worker authorization and missing canary signature rejected before claim',async()=>{
 let count=0;
 const result=await authorizeCanary(request({'x-willflow-dispatch':id,'x-willflow-signature':'a'.repeat(64)}),async()=>{count++;return true;});
 if(result!==null||count!==0)throw Error('wrong namespace accepted');
});
Deno.test('one authorization can be claimed once; digest passed, not signature',async()=>{
 let used=false;
 const claim=async(i:string,d:string)=>{if(i!==id||d==='a'.repeat(64)||d.length!==64)throw Error('bad digest');if(used)return false;used=true;return true;};
 const headers={'x-pr2-dispatch':id,'x-pr2-signature':'a'.repeat(64)};
 if(await authorizeCanary(request(headers),claim)!==id)throw Error('valid rejected');
 if(await authorizeCanary(request(headers),claim)!==null)throw Error('replay accepted');
});
Deno.test('parameters cannot change fixed destinations',async()=>{
 const result=await authorizeCanary(request({'x-pr2-dispatch':id,'x-pr2-signature':'a'.repeat(64)},'{"destination":"other"}'),async()=>{throw Error('claim should not run');});
 if(result!==null)throw Error('parameters accepted');
});