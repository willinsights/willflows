"""Disposable synthetic PostgreSQL fixture; Unix socket only, TCP disabled."""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
pgdirs = list(Path('/nix/store').glob('*-postgresql-17.*/bin'))
if not pgdirs:
    raise RuntimeError('Local PostgreSQL 17 binaries required; never fall back to hosted env vars.')
pg = pgdirs[0]
tmp = Path(tempfile.mkdtemp(prefix='g04-s03-'))
os.chmod(tmp, 0o777)
prefix = ['runuser', '-u', 'nobody', '--'] if os.geteuid() == 0 else []
env = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'SUPABASE', 'DATABASE', 'LOVABLE_BROWSER'))}
def run(args, **kwargs):
    return subprocess.run(prefix + [str(x) for x in args], env=env, check=True, **kwargs)
started = False
try:
    run([pg/'initdb', '-D', tmp/'data', '-A', 'trust', '--no-locale'], stdout=subprocess.DEVNULL)
    run([pg/'pg_ctl', '-D', tmp/'data', '-l', tmp/'server.log', '-o', f"-k {tmp} -p 55441 -c listen_addresses=''", '-w', 'start'], stdout=subprocess.DEVNULL)
    started = True
    sql = (ROOT/'positive-tests.sql').read_text()
    sql += (ROOT/'candidate.sql').read_text().replace('BEGIN;', '').replace('COMMIT;', '')
    sql += (ROOT/'flows.sql').read_text()
    sql += (ROOT/'rollback.sql').read_text().replace('BEGIN;', '').replace('COMMIT;', '')
    sql += "DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='g04_s03_video_context') OR to_regprocedure('public.g04_s03_video_context_guard()') IS NOT NULL THEN RAISE EXCEPTION 'Rollback incomplete'; END IF; END $$;"
    run([pg/'psql', '-X', '-h', tmp, '-p', '55441', '-U', 'nobody' if prefix else os.environ.get('USER', 'postgres'), '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-1'], input=sql, text=True)
    print('PASS: legitimate service upload/replacement, authenticated token/comment/reply/approval/metadata, static ACL/BEFORE checks and specific rollback; synthetic RLS only.')
finally:
    if started:
        run([pg/'pg_ctl', '-D', tmp/'data', '-m', 'immediate', '-w', 'stop'], stdout=subprocess.DEVNULL)
    shutil.rmtree(tmp)