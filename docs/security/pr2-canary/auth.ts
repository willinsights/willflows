export async function authorizeCanary(req: Request, claim: (id:string,digest:string)=>Promise<boolean>) {
 const id=req.headers.get('x-pr2-dispatch')??'';
 const signature=req.headers.get('x-pr2-signature')??'';
 if(req.method!=='POST'||!/^\{\s*\}$/.test(await req.text())||
 !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)||
 !/^[0-9a-f]{64}$/.test(signature))return null;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature));
 const hex=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 return await claim(id,hex)?id:null;
}