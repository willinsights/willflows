// Isolated v2 ticket bound to durable operation. Never accept a legacy ticket as
// a durable operation without a separately designed transition.
export interface OperationTicket { operation_id:string; user_id:string; workspace_id:string; project_id:string; task_id:string|null; key:string; file_name:string; file_size:number; replace_version_id:string|null; expires_at:number }
const enc=new TextEncoder();
async function hmac(secret:string){if(!secret)throw new Error('Missing signing configuration');return crypto.subtle.importKey('raw',enc.encode('willflow:durable-upload:v2:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signOperation(t:OperationTicket,secret:string){
  const body=Array.from(enc.encode(JSON.stringify(t)),b=>String.fromCharCode(b)).join('');const b64=btoa(body);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(secret),enc.encode(b64)));
  return b64+'.'+Array.from(sig,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyOperation(value:string,expected:OperationTicket,secret:string,now=Date.now()){
  const [body,sig,extra]=value.split('.');if(!body||!sig||extra||value.length>8192||!/^[a-f0-9]{64}$/.test(sig))throw new Error('Invalid operation ticket');
  const bytes=Uint8Array.from(sig.match(/../g)||[],s=>parseInt(s,16));
  if(!await crypto.subtle.verify('HMAC',await hmac(secret),bytes,enc.encode(body)))throw new Error('Invalid signature');
  const t=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body),b=>b.charCodeAt(0)))) as OperationTicket;
  for(const k of Object.keys(expected) as (keyof OperationTicket)[])if(t[k]!==expected[k])throw new Error('Operation context mismatch');
  if(!Number.isFinite(t.expires_at)||t.expires_at<=now)throw new Error('Upload expired');
  return t;
}