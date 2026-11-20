"""Assemble candidate only. Never connect to a database or start a pause."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from assemble_candidate import candidate_sql, ACCOUNTING_LOCK

def coordinated_sql(review=None):
    # Accounting reconciliation/checks and activation commit or roll back together.
    sql=candidate_sql(review)
    if sql.count(ACCOUNTING_LOCK)!=1:
        raise ValueError('Expected exactly one accounting table lock')
    # Table locks NOWAIT precede the shared advisory lock, like existing writers.
    # This avoids an advisory→table / table→advisory lock inversion.
    return sql.replace(ACCOUNTING_LOCK,ACCOUNTING_LOCK+'\nSELECT willflow_video_control.activate_coordinated();',1)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--reconcile-counter',nargs=5)
    print(coordinated_sql(p.parse_args().reconcile_counter),end='')