import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { uploadHandlers, UploadFailure } from './integrated-upload.ts';
import { VideoContextError } from './video-context.ts';
import { freezeVideoSource } from './r2-frozen-source.ts';
import { MaintenanceStop } from './execution-control.ts';
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
      const handlers=uploadHandlers({db,secret:env('SUPABASE_SERVICE_ROLE_KEY'),bucket,coordinated:true,
        authenticate:async r=>{const token=/^Bearer ([^\s,]+)$/.exec(r.headers.get('authorization')??'')?.[1];if(!token)return null;const result=await db.auth.getUser(token);return result.error?null:result.data.user?.id??null;},
        signPut:async(key,type,seconds)=>{const url=new URL(objectUrl(key));url.searchParams.set('X-Amz-Expires',String(seconds));return (await aws.sign(new Request(url,{method:'PUT',headers:{'Content-Type':type}}),{aws:{signQuery:true}})).url;},
        head:async key=>{const r=await aws.fetch(objectUrl(key),{method:'HEAD'});const size=r.headers.get('content-length');return r.ok&&size!==null?{size:Number(size),etag:r.headers.get('etag')??''}:null;},
        copy:async(key,meta,etag,size,check)=>{
          const snapshot=await freezeVideoSource({
            workspaceId:meta.workspaceId,operationId:meta.operationId,key,size,etag,
          },{
            hold:async target=>{
              await check();
              const {error}=await db.from('video_asset_outbox').insert({
                workspace_id:meta.workspaceId,version_id:meta.versionId,
                provider:'r2',asset_key:target,reason:'frozen_input_held',
              });
              // Duplicate reference is already held; no destructive cleanup allowed.
              if(error && error.code!=='23505')throw new Error('FROZEN_LEDGER_UNCONFIRMED');
            },
            copyConditional:async(source,target,match)=>{
              await check();
              const sourcePath=`/${bucket}/${source.split('/').map(encodeURIComponent).join('/')}`;
              const response=await aws.fetch(objectUrl(target),{
                method:'PUT',
                headers:{
                  'x-amz-copy-source':sourcePath,
                  'x-amz-copy-source-if-match':match,
                  // Cloudflare R2 destination create-only extension. Fail closed
                  // if unavailable rather than overwriting an earlier snapshot.
                  'cf-copy-destination-if-none-match':'*',
                },
              });
              if(!response.ok)throw new Error('FROZEN_COPY_UNCONFIRMED');
            },
            head:async target=>{
              await check();
              const response=await aws.fetch(objectUrl(target),{method:'HEAD'});
              const value=response.headers.get('content-length');
              return response.ok&&value!==null
                ?{size:Number(value),etag:response.headers.get('etag')??''}:null;
            },
          });
          // Only the backend can address the snapshot key; old signed PUT URLs
          // target the original key, not this immutable snapshot.
          const url=new URL(objectUrl(snapshot));
          url.searchParams.set('X-Amz-Expires','7200');
          const signed=await aws.sign(new Request(url),{aws:{signQuery:true}});
          await check();
          const b=await stream('/copy',{method:'POST',body:JSON.stringify({
            input:signed.url,
            name:meta.operationId,
            meta:{...meta,name:meta.operationId,snapshotKey:snapshot},
            requireSignedURLs:true,allowedOrigins:[],
          })});
          if(typeof b.result?.uid!=='string')throw new Error('PROVIDER_UNCONFIRMED');
          return b.result.uid;
        },
        // The Cloudflare API filters exact meta.name with video_name, not with
        // page/per_page. A capped/ambiguous result is always left uncertain.
        // Older provider copies without meta.name need operator reconciliation.
        findAccepted:async id=>{
          const b=await stream(`?video_name=${encodeURIComponent(id)}&limit=1000`);
          if(!Array.isArray(b.result)||b.result.length>=1000||Number(b.range)>0)
            throw new Error('PROVIDER_SEARCH_INCOMPLETE');
          return b.result.filter((x:any)=>x.meta?.operationId===id&&x.meta?.name===id&&typeof x.uid==='string')
            .map((x:any)=>({uid:x.uid,operation_id:id,key:x.meta.key,workspace_id:x.meta.workspaceId,version_id:x.meta.versionId}));
        },
      });
      const body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')return json({code:'INVALID_INPUT'},400);
      return json(await handlers[action](req,body));
    } catch(error){
      if(error instanceof MaintenanceStop)return json({code:'UPLOAD_MAINTENANCE'},503);
      const code=error instanceof UploadFailure?error.code:error instanceof VideoContextError?'VIDEO_CONTEXT_INVALID':error instanceof Error&&/expired/i.test(error.message)?'UPLOAD_EXPIRED':error instanceof Error&&/uncertain|retained/i.test(error.message)?'PROVIDER_UNCERTAIN':'UPLOAD_UNCONFIRMED';
      return json({code},error instanceof UploadFailure?error.status:code==='VIDEO_CONTEXT_INVALID'?403:code==='UPLOAD_EXPIRED'||code==='PROVIDER_UNCERTAIN'?409:503);
    }
  });
}
