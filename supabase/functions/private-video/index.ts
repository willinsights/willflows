// Separate new-only runtime. Missing private schema/enrollment fails closed; v1 handlers remain untouched.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {AwsClient} from 'npm:aws4fetch@1';
import {sidecarRequest} from './sidecar-handler.ts';
import {privateUpload} from './sidecar-upload.ts';
import {providerPlayback} from './playback.ts';
import {inventory} from './inventory.ts';
Deno.serve(async(req:Request)=>{
 const headers={...corsHeaders,'Content-Type':'application/json','Cache-Control':'private, no-store','X-WillFlow-Private-Video':'sidecar-1'};
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return new Response(JSON.stringify({code:'METHOD_NOT_ALLOWED'}),{status:405,headers});
 try{
  const env=(name:string)=>{const value=Deno.env.get(name);if(!value)throw Error('Missing configuration');return value;};
  const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
  const account=env('CLOUDFLARE_ACCOUNT_ID'),bucket=env('CLOUDFLARE_R2_BUCKET'),credential=env('CLOUDFLARE_STREAM_TOKEN');
  const aws=new AwsClient({accessKeyId:env('CLOUDFLARE_R2_ACCESS_KEY'),secretAccessKey:env('CLOUDFLARE_R2_SECRET_KEY'),region:'auto',service:'s3'});
  const object=(key:string)=>`https://${account}.r2.cloudflarestorage.com/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const stream=async(path:string,init:RequestInit={})=>{
   const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream${path}`,{...init,headers:{Authorization:`Bearer ${credential}`,'Content-Type':'application/json'}});
   if(!r.ok)throw Error('Provider unconfirmed');const data=await r.json();if(data.success!==true)throw Error('Provider unconfirmed');return data;
  };
  const base={rpc:async(name:string,args:Record<string,unknown>)=>await db.rpc(name,args),authenticate:async(r:Request)=>{
   const token=/^Bearer ([^\s,]+)$/.exec(r.headers.get('authorization')??'')?.[1];if(!token)return null;
   const {data,error}=await db.auth.getUser(token);return error?null:data.user?.id??null;
  }};
  const body=await req.clone().json();const upload=['issue','process','abort','withdraw','recover'].includes(body?.action);
  if(body?.action==='inventory'){
   const result=await inventory(req,body,db,aws,object,stream);
   return new Response(result.body,{status:result.status,headers});
  }
  const response=upload?await privateUpload(req,{...base,
   signPut:async(key,type,seconds)=>{const url=new URL(object(key));url.searchParams.set('X-Amz-Expires',String(seconds));return (await aws.sign(new Request(url,{method:'PUT',headers:{'Content-Type':type}}),{aws:{signQuery:true}})).url;},
   head:async key=>{const r=await aws.fetch(object(key),{method:'HEAD'});const bytes=r.headers.get('content-length');return r.ok&&bytes!==null?{bytes:Number(bytes),etag:r.headers.get('etag')??''}:null;},
   freezeAndCopy:async(v,_claim,etag,hold)=>{
    const snapshot='__willflow_v2/'+v.workspace_id+'/'+v.operation_id+'/frozen.mp4';await hold(snapshot);
    const copied=await aws.fetch(object(snapshot),{method:'PUT',headers:{'x-amz-copy-source':`/${bucket}/${v.object_key.split('/').map(encodeURIComponent).join('/')}`,'x-amz-copy-source-if-match':etag,'cf-copy-destination-if-none-match':'*'}});
    if(!copied.ok)throw Error('Snapshot unconfirmed');
    const frozen=await aws.fetch(object(snapshot),{method:'HEAD'});
    if(!frozen.ok||Number(frozen.headers.get('content-length'))!==Number(v.bytes))throw Error('Snapshot mismatch');
    const url=new URL(object(snapshot));url.searchParams.set('X-Amz-Expires','7200');
    const signed=await aws.sign(new Request(url),{aws:{signQuery:true}});
    const result=await stream('/copy',{method:'POST',body:JSON.stringify({input:signed.url,name:v.operation_id,
     requireSignedURLs:true,allowedOrigins:[],meta:{name:v.operation_id,operation_id:v.operation_id,workspace_id:v.workspace_id,version_id:v.id,key:v.object_key}})});
    if(typeof result.result?.uid!=='string'||!/^[a-f0-9]{32}$/.test(result.result.uid))throw Error('Provider unconfirmed');return result.result.uid;
   },
   findAccepted:async v=>{
    const result=await stream(`?video_name=${encodeURIComponent(v.operation_id)}&limit=1000`);
    if(!Array.isArray(result.result)||result.result.length>=1000||Number(result.range)>0)throw Error('Incomplete provider search');
    return result.result.filter((x:any)=>x.meta?.name===v.operation_id).map((x:any)=>({uid:x.uid,...x.meta}));
   },
  }):await sidecarRequest(req,{...base,download:async key=>{const url=new URL(object(key));url.searchParams.set('X-Amz-Expires','300');return (await aws.sign(new Request(url),{aws:{signQuery:true}})).url;},ready:async uid=>{const status=(await stream('/'+uid)).result;return status?.readyToStream===true&&status?.requireSignedURLs===true;},sign:providerPlayback(account,credential)});
  // CORS and no-store apply to every result, including refusal/revocation/error.
  const merged=new Headers(response.headers);
  for(const [key,value] of Object.entries(headers))merged.set(key,value);
  return new Response(response.body,{status:response.status,headers:merged});
 }catch{return new Response(JSON.stringify({code:'PRIVATE_VIDEO_UNAVAILABLE'}),{status:503,headers});}
});