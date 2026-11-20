"""Emit the candidate expansion transaction; never connect or initialize/pause control state."""
from pathlib import Path
import hashlib
here=Path(__file__).resolve().parent
def assemble():
    hashes=dict(line.split('  ',1)[::-1] for line in (here/'EXPAND-SHA256SUMS').read_text().splitlines())
    parts=[]
    for name in ('accounting-expand.sql','upload-expand.sql','../02-total-quota.sql','generation-fence.sql'):
        source=(here/name).read_text()
        if hashlib.sha256(source.encode()).hexdigest()!=hashes[name]:raise RuntimeError('Candidate hash mismatch: '+name)
        lines=source.strip().splitlines()
        if lines[0]!='BEGIN;' or lines[-1]!='COMMIT;':raise RuntimeError('Invalid transaction wrapper: '+name)
        parts.append('\n'.join(lines[1:-1]))
    return 'BEGIN;\n'+'\n'.join(parts)+'\nCOMMIT;\n'
if __name__=='__main__':print(assemble(),end='')