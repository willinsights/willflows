export interface Transport {
  invoke:(name:string,body:any)=>Promise<any>;
  put:(url:string,file:File,signal:AbortSignal,progress:(n:number)=>void)=>Promise<void>;
}
// One identity per selected File/context; never silently restart expiry/uncertainty.
export class DurableUploadClient {
  private active:{
    file:File;context:any;id:string;issued?:any;uploaded:boolean;
    controller:AbortController;running?:Promise<any>
  }|null=null;
  constructor(private transport:Transport){}
  async run(file:File,context:any,progress:(n:number)=>void=()=>{}) {
    if(!this.active||this.active.file!==file||JSON.stringify(this.active.context)!==JSON.stringify(context)) {
      if(this.active && !this.active.controller.signal.aborted) throw new Error('UPLOAD_ALREADY_ACTIVE');
      this.active={file,context,id:crypto.randomUUID(),uploaded:false,controller:new AbortController()};
    }
    const a=this.active;
    // Coalesce simultaneous retries of this operation. Without this guard two callers
    // could PUT to the same signed object key while the provider copies it.
    if(a.running)return a.running;
    const execute=async()=>{
      const body={...context,fileName:file.name,fileSize:file.size,mimeType:file.type,operationId:a.id};
      if(!a.issued)a.issued=await this.transport.invoke('r2-upload-url',body);
      if(a.controller.signal.aborted)throw new Error('UPLOAD_ABORTED');
      if(a.issued.uploadUrl&&!a.uploaded){
        await this.transport.put(a.issued.uploadUrl,file,a.controller.signal,progress);
        a.uploaded=true;
      }
      const result=await this.transport.invoke('stream-process-video',{...body,key:a.issued.key,uploadTicket:a.issued.uploadTicket});
      if(!result?.versionId || result.status==='uncertain')throw new Error('PROVIDER_UNCERTAIN');
      if(this.active===a)this.active=null;
      return result;
    };
    const running=execute();
    a.running=running;
    try { return await running; }
    finally { if(this.active===a)a.running=undefined; }
  }
  async abort(){const a=this.active;if(!a)return; a.controller.abort();await this.transport.invoke('video-upload-abort',{operationId:a.id});}
  async recover(){const a=this.active;if(!a)throw new Error('RECOVERY_NOT_REQUIRED');return this.transport.invoke('video-upload-recover',{operationId:a.id});}
}
