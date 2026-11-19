// Shared total contract: storage_limit_bytes ALREADY includes purchased extras.
// This is a client-side preflight hint: the server must independently validate
// workspace membership, replacement ownership and the atomic quota delta.
export function quotaInfo(row: {storage_used_bytes:number;storage_limit_bytes:number}|null, failed=false) {
  const valid=!failed && row!==null && Number.isSafeInteger(row.storage_used_bytes) && row.storage_used_bytes>=0 && Number.isSafeInteger(row.storage_limit_bytes) && row.storage_limit_bytes>=0;
  const used=valid&&row?row.storage_used_bytes:0, limit=valid&&row?row.storage_limit_bytes:0;
  return {
    usedBytes:used,
    limitBytes:limit,
    remainingBytes:Math.max(0,limit-used),
    ready:valid,
    canUpload:(size:number,replacedBytes=0)=>{
      if(!valid||!Number.isSafeInteger(size)||size<=0||!Number.isSafeInteger(replacedBytes)||replacedBytes<0||replacedBytes>used)return false;
      const delta=size-replacedBytes;
      const next=used+delta;
      return Number.isSafeInteger(next)&&next>=0&&next<=limit;
    },
  };
}
