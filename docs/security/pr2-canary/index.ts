import { createClient } from 'npm:@supabase/supabase-js@2';
import { AwsClient } from 'npm:aws4fetch@1';
import { authorizeCanary } from './auth.ts';
import { fixtures } from './fixtures.ts';
const env=(name:string)=>{const v=Deno.env.get(name);if(!v)throw Error('CONFIGURATION');return v;};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:{'X-WillFlow-Canary-Version':'1'}});
 let id:string|null=null;
 let stage='authorization';
 const proof:Record<string,unknown>={version:1,checks:[]};
 const checks=proof.checks as Array<Record<string,unknown>>;
 const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
 try{
  id=await authorizeCanary(req,async(i,d)=>{
   const {data,error}=await db.rpc('claim_pr2_video_canary',{p_id:i,p_digest:d});return !error&&data===true;
  });
  if(!id)return new Response(null,{status:401});
  stage='configuration';
  const account=env('CLOUDFLARE_ACCOUNT_ID'),bucket=env('CLOUDFLARE_R2_BUCKET');
  const aws=new AwsClient({accessKeyId:env('CLOUDFLARE_R2_ACCESS_KEY'),secretAccessKey:env('CLOUDFLARE_R2_SECRET_KEY'),region:'auto',service:'s3'});
  const token=env('CLOUDFLARE_STREAM_TOKEN');
  const prefix=`willflow-pr2-canary/${id}/`;
  proof.prefix=prefix;
  const url=(key:string)=>`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const stream=async(path:string,init:RequestInit={})=>{
   const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
   if(!r.ok)throw Error(`STREAM_HTTP_${r.status}`);
   const b=await r.json();if(!b.success)throw Error('STREAM_REJECTED');return b;
  };
  for(let n=0;n<fixtures.length;n++){
   const operationId=`${id}-fixture-${n}`;
   const source=`${prefix}fixture-${n}.mp4`,target=`${prefix}snapshot-${n}.mp4`;
   const bytes=Uint8Array.from(atob(fixtures[n]),c=>c.charCodeAt(0));
   stage=`r2-put-${n}`;
   const put=await aws.fetch(url(source),{method:'PUT',headers:{'Content-Type':'video/mp4','If-None-Match':'*'},body:bytes});
   checks.push({step:stage,status:put.status,bytes:bytes.length});
   if(!put.ok)throw Error('R2_PUT_REJECTED');
   const head=await aws.fetch(url(source),{method:'HEAD'});
   const etag=head.headers.get('etag');
   if(!head.ok||!etag||Number(head.headers.get('content-length'))!==bytes.length)throw Error('HEAD_MISMATCH');
   checks.push({step:`r2-head-${n}`,status:head.status,bytes:bytes.length});
   stage=`conditional-copy-${n}`;
   const copyHeaders={'x-amz-copy-source':`/${bucket}/${source}`,'x-amz-copy-source-if-match':etag,'cf-copy-destination-if-none-match':'*'};
   const copy=await aws.fetch(url(target),{method:'PUT',headers:copyHeaders});
   checks.push({step:stage,status:copy.status});if(!copy.ok)throw Error('COPY_REJECTED');
   const snapshot=await aws.fetch(url(target),{method:'HEAD'});
   const snapshotEtag=snapshot.headers.get('etag');
   if(!snapshot.ok||Number(snapshot.headers.get('content-length'))!==bytes.length||snapshotEtag!==etag)throw Error('SNAPSHOT_MISMATCH');
   stage=`overwrite-rejection-${n}`;
   const duplicate=await aws.fetch(url(target),{method:'PUT',headers:copyHeaders});
   checks.push({step:stage,status:duplicate.status});
   if(duplicate.status!==412)throw Error('CREATE_ONLY_NOT_ENFORCED');
   const wrong=await aws.fetch(url(`${prefix}wrong-etag-${n}.mp4`),{method:'PUT',headers:{...copyHeaders,'x-amz-copy-source-if-match':'"nonmatching-synthetic-etag"'}});
   checks.push({step:`source-condition-${n}`,status:wrong.status});if(wrong.status!==412)throw Error('SOURCE_CONDITION_NOT_ENFORCED');
   stage=`stream-ingestion-${n}`;
   const input=new URL(url(target));input.searchParams.set('X-Amz-Expires','600');
   const signed=await aws.sign(new Request(input),{aws:{signQuery:true}});
   const ingested=await stream('/copy',{method:'POST',body:JSON.stringify({input:signed.url,requireSignedURLs:true,meta:{name:operationId,operationId,canary:'pr2-v1'},allowedOrigins:[]})});
   const uid=ingested.result?.uid;
   if(typeof uid!=='string')throw Error('STREAM_UNCERTAIN');
   checks.push({step:stage,status:200,uid});
   const detail=await stream(`/${uid}`);
   if(detail.result?.requireSignedURLs!==true)throw Error('PRIVATE_PLAYBACK_UNCONFIRMED');
   const playback=await stream(`/${uid}/token`,{method:'POST',body:JSON.stringify({exp:Math.floor(Date.now()/1000)+120})});
   if(typeof playback.result?.token!=='string')throw Error('PLAYBACK_SIGNING_UNCONFIRMED');
   checks.push({step:`private-playback-${n}`,signed:true});
   stage=`operation-recovery-${n}`;
   for(let read=0;read<2;read++){
    const found=await stream(`?video_name=${encodeURIComponent(operationId)}&limit=1000`);
    if(!Array.isArray(found.result)||found.result.length>=1000)throw Error('SEARCH_INCOMPLETE');
    const exact=found.result.filter((v:any)=>v.meta?.operationId===operationId&&v.meta?.name===operationId);
    if(exact.length!==1||exact[0].uid!==uid)throw Error('RECOVERY_UNCONFIRMED');
    checks.push({step:stage,read,matches:exact.length});
   }
  }
  proof.success=true;
 }catch(e){proof.success=false;proof.failedStage=stage;proof.error=e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNCONFIRMED';}
 if(id){
  const {data,error}=await db.rpc('finish_pr2_video_canary',{p_id:id,p_proof:proof});
  if(error||data!==true)return new Response(null,{status:503});
 }
 return new Response(null,{status:proof.success===true?204:503});
});
