// Offline fixture runner only. Rejects every non-Unix socket; no hosted credentials or provider requests.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {sidecarRequest} from './sidecar-handler';
import {privateUpload} from './sidecar-upload';
const socket=process.argv[2];
if(!socket?.startsWith('/tmp/wf-sidecar-'))throw Error('Explicit disposable socket required');
const input=JSON.parse(readFileSync(0,'utf8'));
const literal=(value:unknown)=>value==null?'NULL':typeof value==='number'?String(value):typeof value==='boolean'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const rpc=async(name:string,args:Record<string,unknown>)=>{
 if(!/^private_video_[a-z]+$/.test(name)||Object.keys(args).some(k=>!/^p_[a-z_]+$/.test(k)))throw Error('Fixture RPC only');
 try{
  const statement="SET request.jwt.claims='{\"role\":\"service_role\"}';SELECT "+name+'('+Object.entries(args).map(([k,v])=>k+'=>'+literal(v)).join(',')+');';
  const result=execFileSync(input.psql,['-X','-h',socket,'-p','55462','-U','fixture','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',statement],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim().split('\n').pop();
  let data:any=null;
  if(result==='t')data=true;else if(result==='f')data=false;else if(result){try{data=JSON.parse(result);}catch{data=result;}}
  return {data,error:null};
 }catch{return {data:null,error:'fixture denied'};}
};
const req=new Request('http://localhost/fixture',{method:'POST',body:JSON.stringify(input.body)});
const base={rpc,authenticate:async()=>input.member?'44444444-4444-4444-8444-444444444444':null};
const res=input.upload?await privateUpload(req,{...base,signPut:async()=> 'http://localhost:8080/__sidecar_fixture_put',head:async()=>({bytes:input.bytes,etag:'fixture'}),
 freezeAndCopy:async(v,_claim,_etag,hold)=>{await hold('__willflow_v2/'+v.workspace_id+'/'+v.operation_id+'/frozen.mp4');return 'd'.repeat(32);},findAccepted:async()=>[]}):await sidecarRequest(req,{...base,ready:async()=>true,sign:async()=>({url:'http://localhost:8080/__sidecar_fixture.mp4',thumbnail:'',expiresAt:Math.floor(Date.now()/1000)+900})});
console.log(JSON.stringify({status:res.status,body:await res.json()}));