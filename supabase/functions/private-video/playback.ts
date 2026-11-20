export function providerPlayback(account:string,credential:string){
 return async(uid:string)=>{
  if(!/^[a-f0-9]{32}$/.test(uid))throw Error('Invalid Stream identity');
  const expiresAt=Math.floor(Date.now()/1000)+900;
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/${uid}/token`,{method:'POST',headers:{Authorization:`Bearer ${credential}`,'Content-Type':'application/json'},body:JSON.stringify({exp:expiresAt})});
  if(!r.ok)throw Error('Playback unconfirmed');const data=await r.json();
  const token=data.result?.token;if(data.success!==true||typeof token!=='string'||!/^[A-Za-z0-9._-]+$/.test(token))throw Error('Playback unconfirmed');
  return {url:`https://videodelivery.net/${token}/manifest/video.m3u8`,thumbnail:`https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=50p`,expiresAt};
 };
}