import { expect, it, vi } from 'vitest';
import { authorizedPlayback, providerPlayback, privateHeaders } from '../supabase/functions/_shared/private-playback';
const ws='11111111-1111-4111-8111-111111111111', project='22222222-2222-4222-8222-222222222222', id='33333333-3333-4333-8333-333333333333';
const uid='a'.repeat(32);
function fixture(options: {member?:boolean;active?:boolean;expired?:boolean;other?:boolean;legacy?:boolean}={}) {
 const scope={workspace_id:ws,project_id:project,task_id:null};
 const rows:Record<string,any[]>={projects:[{id:project,workspace_id:ws}],video_versions:[{...scope,id,is_deleted:false,cloudflare_stream_uid:options.legacy?null:uid}],workspace_members:options.member===false?[]:[{workspace_id:ws,user_id:'user',is_active:true}],video_approval_tokens:[{...scope,workspace_id:options.other?'44444444-4444-4444-8444-444444444444':ws,token:'link',is_active:options.active!==false,expires_at:options.expired?'2000-01-01T00:00:00Z':null}]};
 return {from(table:string){let data=[...(rows[table]??[])];const q={select:()=>q,eq:(k:string,v:any)=>{data=data.filter(x=>x[k]===v);return q;},maybeSingle:async()=>({data:data[0],error:null})};return q;}};
}
it('signs for an active workspace member after scoped validation',async()=>{
 const sign=vi.fn(async()=>({url:'private',thumbnail:'private-thumb',expiresAt:123}));
 expect(await authorizedPlayback(fixture(),{versionId:id},'user',sign)).toMatchObject({url:'private'});
 expect(sign).toHaveBeenCalledWith(uid);
});
it('signs for an active scoped approval link without an application session',async()=>{
 const sign=vi.fn(async()=>({url:'private',thumbnail:'thumb',expiresAt:123}));
 await authorizedPlayback(fixture({member:false}),{versionId:id,approvalToken:'link'},null,sign);
 expect(sign).toHaveBeenCalledTimes(1);
});
it.each([{member:false},{active:false},{expired:true},{other:true}])('rejects unauthorized identity/link before provider access: %j',async options=>{
 const sign=vi.fn();
 const input=options.member===false?{versionId:id}:{versionId:id,approvalToken:'link'};
 await expect(authorizedPlayback(fixture(options),input,'user',sign)).rejects.toThrow();
 expect(sign).not.toHaveBeenCalled();
});
it('retains legacy scoped Storage fallback without provider signing',async()=>{
 const sign=vi.fn();expect(await authorizedPlayback(fixture({legacy:true}),{versionId:id},'user',sign)).toMatchObject({url:null});expect(sign).not.toHaveBeenCalled();
});
it('rejects a membership revoked during signing',async()=>{
 const db=fixture();let revoked=false;const original=db.from;
 db.from=(table:string)=>revoked&&table==='workspace_members'?fixture({member:false}).from(table):original(table);
 await expect(authorizedPlayback(db,{versionId:id},'user',async()=>{revoked=true;return {url:'private',thumbnail:'thumb',expiresAt:123};})).rejects.toThrow('Membership revoked');
});
it('provider token has a 15 minute expiry and response forbids public caching',async()=>{
 const request=vi.fn(async(_url:any,init:any)=>{expect(JSON.parse(init.body).exp).toBeGreaterThan(Math.floor(Date.now()/1000)+890);return new Response(JSON.stringify({success:true,result:{token:'fixture-token'}}));});
 expect((await providerPlayback('fixture','not-a-real-credential',request as typeof fetch)(uid)).url).toContain('/fixture-token/manifest/');
 expect(privateHeaders['Cache-Control']).toBe('private, no-store, max-age=0');
});