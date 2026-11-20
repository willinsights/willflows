"""Offline new-only bundle: accounting normalization + private registry + budget.
Does not execute SQL, reconcile a divergence, pause, enroll, or edit older bundles.
"""
from pathlib import Path
import hashlib
here=Path(__file__).resolve().parent
def assemble():
    hashes=dict(line.split('  ',1)[::-1] for line in (here/'EXPAND-SHA256SUMS').read_text().splitlines())
    accounting=(here/'accounting-expand.sql').read_text()
    if hashlib.sha256(accounting.encode()).hexdigest()!=hashes['accounting-expand.sql']:raise RuntimeError('Accounting hash mismatch')
    sidecar=(here/'sidecar.sql').read_text()
    parts=[]
    for text in (accounting,sidecar):
        lines=text.strip().splitlines()
        if lines[0]!='BEGIN;' or lines[-1]!='COMMIT;':raise RuntimeError('Missing wrapper')
        parts.append('\n'.join(lines[1:-1]))
    guard='''CREATE TRIGGER private_video_budget AFTER INSERT OR UPDATE OF storage_used_bytes,storage_limit_bytes
 ON public.workspace_storage FOR EACH ROW EXECUTE FUNCTION public.guard_private_video_budget();
CREATE TRIGGER private_video_projection BEFORE INSERT OR UPDATE OF id,r2_key,replacement_r2_key,cloudflare_stream_uid,replacement_stream_uid
 ON public.video_versions FOR EACH ROW EXECUTE FUNCTION public.guard_private_video_projection();'''
    return 'BEGIN;\n'+'\n'.join(parts)+'\n'+guard+'\nCOMMIT;\n'
if __name__=='__main__':print(assemble(),end='')