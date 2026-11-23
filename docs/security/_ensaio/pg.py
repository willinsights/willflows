"""PostgreSQL 17 descartável num socket local (/tmp). Só identidades fictícias."""
from contextlib import contextmanager
from pathlib import Path
import os, subprocess, tempfile, shutil

PG = Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
ENV = {k: v for k, v in os.environ.items() if not k.startswith(('PG', 'DATABASE', 'SUPABASE', 'LOVABLE'))}
ENV['LC_ALL'] = 'C'

BASE = '''
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
'''

class Db:
    def __init__(self, tmp, port): self.tmp, self.port = tmp, port
    def _psql(self, extra, **kw):
        return subprocess.run([str(PG/'psql'), '-X', '-h', str(self.tmp), '-p', str(self.port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', *extra],
                              env=ENV, text=True, capture_output=True, **kw)
    def sql(self, s):
        r = self._psql(['-At'], input=s)
        if r.returncode: raise RuntimeError(r.stderr.strip())
        return r.stdout.strip()
    def file(self, p):
        r = self._psql(['-q', '-f', str(p)])
        if r.returncode: raise RuntimeError(r.stderr.strip())
    def as_user(self, uid, s):
        """Runs s as role authenticated with auth.uid() = uid, inside one transaction."""
        return self.sql(f"BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{{\"sub\":\"{uid}\",\"role\":\"authenticated\"}}'; {s}; COMMIT;")
    def rejects(self, fn, needle):
        try: fn()
        except RuntimeError as e: return needle in str(e)
        return False

@contextmanager
def disposable(port=55470):
    tmp = Path(tempfile.mkdtemp(prefix='wfe', dir='/tmp'))
    started = False
    try:
        subprocess.run([str(PG/'initdb'), '-D', str(tmp/'data'), '-A', 'trust', '-U', 'postgres', '--no-locale'], env=ENV, check=True, stdout=subprocess.DEVNULL)
        subprocess.run([str(PG/'pg_ctl'), '-D', str(tmp/'data'), '-l', str(tmp/'log'), '-o', f"-k {tmp} -p {port} -c listen_addresses=''", '-w', 'start'], env=ENV, check=True, stdout=subprocess.DEVNULL)
        started = True
        db = Db(tmp, port); db.sql(BASE)
        yield db
    finally:
        if started: subprocess.run([str(PG/'pg_ctl'), '-D', str(tmp/'data'), '-m', 'immediate', 'stop'], env=ENV, stdout=subprocess.DEVNULL)
        shutil.rmtree(tmp, ignore_errors=True)

def report(checks):
    for name, ok in checks: print(('OK  ' if ok else 'FAIL') + ' ' + name)
    return 0 if all(ok for _, ok in checks) else 1
