// Candidate planning seam, NOT an active issuer: never hand these keys to legacy readers.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isolatedObjectKey(workspace:string,operation:string):string {
  if(!uuid.test(workspace)||!uuid.test(operation))throw Error('INVALID_IDENTITY');
  return `__willflow_v2/${workspace}/${operation}/input.mp4`;
}
export function assertIsolatedIdentity(key:string,workspace:string,operation:string) {
  if(key!==isolatedObjectKey(workspace,operation))throw Error('OBJECT_CONTEXT_MISMATCH');
}