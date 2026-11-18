import {secretEquals} from './timing-safe.ts';
// Side-effect-free candidate. Do not invoke webhook worker to test authorization.
export function workerAuthorization(request:Request,secrets:{service?:string;legacy?:string},managed:(r:Request)=>Response|null):Response|null {
 const token=/^Bearer ([^\s,]+)$/.exec(request.headers.get('authorization')??'')?.[1];
 if(secretEquals(secrets.service,token)||secretEquals(secrets.legacy,request.headers.get('x-cron-secret')))return null;
 // Preserve managed 500 for missing configuration; old worker collapses it into 401.
 return managed(request);
}
