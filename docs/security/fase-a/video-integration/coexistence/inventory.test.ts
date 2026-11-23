import {it,expect,vi} from 'vitest';
import {inventory} from '../../../../../supabase/functions/private-video/inventory';
const ws='11111111-1111-4111-8111-111111111111';
function fixture(admin:boolean){
 const fetch=vi.fn();const stream=vi.fn();
 const db={auth:{getClaims:async()=>({data:{claims:{sub:ws,role:'authenticated'}},error:null})},rpc:vi.fn(async()=>({data:admin,error:null})),from:vi.fn(()=>{throw Error('No access without authorization');})};
 const req=new Request('http://localhost/fixture',{method:'POST',headers:{authorization:'Bearer fixture-only'}});
 return {db,req,fetch,stream};
}
it('individual inventory requires a verified workspace administrator before reading rows or providers',async()=>{
 const f=fixture(false);const r=await inventory(f.req,{workspaceId:ws},f.db,{fetch:f.fetch},()=>'',f.stream);
 expect(r.status).toBe(403);expect(f.db.from).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();expect(f.stream).not.toHaveBeenCalled();
 expect(f.db.rpc).toHaveBeenCalledWith('is_workspace_admin',{_user_id:ws,_workspace_id:ws});
});
it('signed-out inventory never queries membership or provider',async()=>{
 const f=fixture(true);const r=await inventory(new Request('http://localhost/fixture'),{workspaceId:ws},f.db,{fetch:f.fetch},()=>'',f.stream);
 expect(r.status).toBe(401);expect(f.db.rpc).not.toHaveBeenCalled();expect(f.db.from).not.toHaveBeenCalled();
});