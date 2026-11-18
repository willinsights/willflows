import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { uploadHandlers, UploadFailure } from './integrated-upload.ts';
import { VideoContextError } from './video-context.ts';
export function serveUpload(action:'issue'|'process'|'abort'|'recover') {
  Deno.serve(async req=>{
    if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
    const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
    if(req.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405);
    try {
      const env=(name:string)=>{const v=Deno.env.get(name);if(!v)throw new UploadFailure('SERVER_CONFIGURATION',503);return v;};
      const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
      const account=env('CLOUDFLARE_ACCOUNT_ID'),bucket=env('CLOUDFLARE_R2_BUCKET');
      const aws=new AwsClient({accessKeyId:env('CLOUDFLARE_R2_ACCESS_KEY'),secretAccessKey:env('CLOUDFLARE_R2_SECRET_KEY'),region:'auto',service:'s3'});
      const streamToken=env('CLOUDFLARE_STREAM_TOKEN');
      const objectUrl=(key:string)=>`https://${account}.r2.cloudflarestorage.com/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
      const stream=async(path:string,init:RequestInit={})=>{const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream${path}`,{...init,headers:{Authorization:`Bearer ${streamToken}`,'Content-Type':'application/json'}});if(!r.ok)throw new Error('PROVIDER_UNCONFIRMED');const b=await r.json();if(!b.success)throw new Error('PROVIDER_UNCONFIRMED');return b;};
      const handlers=uploadHandlers({db,secret:env('SUPABASE_SERVICE_ROLE_KEY'),bucket,
        authenticate:async r=>{const token=/^Bearer ([^\s,]+)$/.exec(r.headers.get('authorization')??'')?.[1];if(!token)return null;const result=await db.auth.getUser(token);return result.error?null:result.data.user?.id??null;},
        signPut:async(key,type,seconds)=>{const url=new URL(objectUrl(key));url.searchParams.set('X-Amz-Expires',String(seconds));return (await aws.sign(new Request(url,{method:'PUT',headers:{'Content-Type':type}}),{aws:{signQuery:true}})).url;},
        head:async key=>{const r=await aws.fetch(objectUrl(key),{method:'HEAD'});const size=r.headers.get('content-length');return r.ok&&size!==null?{size:Number(size),etag:r.headers.get('etag')??''}:null;},
        copy:async(key,meta)=>{const url=new URL(objectUrl(key));url.searchParams.set('X-Amz-Expires','7200');const signed=await aws.sign(new Request(url),{aws:{signQuery:true}});const b=await stream('/copy',{method:'POST',body:JSON.stringify({url:signed.url,meta,requireSignedURLs:false,allowedOrigins:[]})});if(typeof b.result?.uid!=='string')throw new Error('PROVIDER_UNCONFIRMED');return b.result.uid;},
        // No match is NEVER evidence of non-acceptance; never resubmit a claim.
        // Search must complete pagination. Bounded exhaustion stays uncertain.
        findAccepted:async id=>{const hits:any[]=[];for(let page=1;page<=100;page++){const b=await stream(`?search=${encodeURIComponent(id)}&page=${page}&per_page=100`);if(!Array.isArray(b.result))throw new Error('PROVIDER_UNCONFIRMED');for(const x of b.result){if(x.meta?.operationId===id)hits.push({uid:x.uid,operation_id:id,key:x.meta.key,workspace_id:x.meta.workspaceId,version_id:x.meta.versionId});}if(b.result.length<100)return hits;}throw new Error('PROVIDER_SEARCH_INCOMPLETE');},
      });
      const body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')return json({code:'INVALID_INPUT'},400);
      return json(await handlers[action](req,body));
    } catch(error){
      const code=error instanceof UploadFailure?error.code:error instanceof VideoContextError?'VIDEO_CONTEXT_INVALID':error instanceof Error&&/expired/i.test(error.message)?'UPLOAD_EXPIRED':error instanceof Error&&/uncertain|retained/i.test(error.message)?'PROVIDER_UNCERTAIN':'UPLOAD_UNCONFIRMED';
      return json({code},error instanceof UploadFailure?error.status:code==='VIDEO_CONTEXT_INVALID'?403:code==='UPLOAD_EXPIRED'||code==='PROVIDER_UNCERTAIN'?409:503);
    }
  });
}
