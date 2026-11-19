import { it, expect, vi } from 'vitest';
import { freezeVideoSource, frozenObjectKey } from '../supabase/functions/_shared/r2-frozen-source.ts';

const workspaceId='11111111-1111-4111-8111-111111111111';
const operationId='77777777-7777-4777-8777-777777777777';
const source=`${workspaceId}/22222222-2222-4222-8222-222222222222/project/u/old.mp4`;
const params={ workspaceId, operationId, key:source, size:100, etag:'"abc-etag"' };

it('uses held ledger then an ETag-conditional and destination-create-only snapshot',async()=>{
 const order:string[]=[];
 const hold=vi.fn(async key=>{order.push('hold:'+key);});
 const copyConditional=vi.fn(async(key,to,etag)=>{order.push('copy:'+to);expect(key).toBe(source);expect(etag).toBe(params.etag);});
 const head=vi.fn(async key=>{order.push('head:'+key);return {size:100,etag:'"frozen"'};});
 const frozen=await freezeVideoSource(params,{hold,copyConditional,head});
 expect(frozen).toBe(frozenObjectKey(workspaceId,operationId));
 expect(order).toEqual(['hold:'+frozen,'copy:'+frozen,'head:'+frozen]);
 expect(copyConditional).toHaveBeenCalledTimes(1);
});

it('refuses any external copy before a durable held ledger is recorded',async()=>{
 const copyConditional=vi.fn(async()=>{});
 await expect(freezeVideoSource(params,{
   hold:async()=>{throw Error('DB unavailable');},
   copyConditional,
   head:async()=>null,
 })).rejects.toThrow('DB unavailable');
 expect(copyConditional).not.toHaveBeenCalled();
});

it('leaves a partial or changed snapshot uncertain without invoking Stream',async()=>{
 for(const facts of [null,{size:99,etag:'"snapshot"'},{size:100,etag:''}]){
   await expect(freezeVideoSource(params,{
     hold:async()=>{},copyConditional:async()=>{},head:async()=>facts,
   })).rejects.toThrow('FROZEN_SOURCE_UNCONFIRMED');
 }
});

it('refuses copy precondition error and unsafe ETag or object ID',async()=>{
 await expect(freezeVideoSource(params,{
   hold:async()=>{},copyConditional:async()=>{throw Error('412 PreconditionFailed');},head:async()=>null,
 })).rejects.toThrow('412 PreconditionFailed');
 for(const bad of [{...params,etag:'bad\r\nheader'},{...params,operationId:'../../escape'}, {...params,key:'__willflow_frozen/escape'}]){
   await expect(freezeVideoSource(bad,{
      hold:async()=>{},copyConditional:async()=>{},head:async()=>({size:100,etag:'"ok"'}),
   })).rejects.toThrow();
 }
});
