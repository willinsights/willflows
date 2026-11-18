import {it,expect} from 'vitest';
import {workerAuthorization} from '../worker/authorization';
const managed=(r:Request)=>r.headers.get('authorization')==='Bearer managed-fixture'?null:new Response('Unauthorized',{status:401});
it.each([{authorization:'Bearer managed-fixture'},{authorization:'Bearer service-fixture'},{'x-cron-secret':'legacy-fixture'}])('worker accepts configured auth fixture %j without executing a job',headers=>{expect(workerAuthorization(new Request('http://localhost',{headers}),{service:'service-fixture',legacy:'legacy-fixture'},managed)).toBeNull();});
it.each([{}, {authorization:'Bearer bad'},{'x-cron-secret':'bad'}])('worker rejects missing/invalid auth %j',headers=>{expect(workerAuthorization(new Request('http://localhost',{headers}),{},managed)?.status).toBe(401);});
it('managed missing configuration stays 500, not falsely diagnosed as wrong token',()=>{expect(workerAuthorization(new Request('http://localhost'),{},()=>new Response('Server configuration error',{status:500}))?.status).toBe(500);});
