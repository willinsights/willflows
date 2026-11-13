"""Execute candidate only against an empty, local, Unix-socket PostgreSQL fixture."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-h', '/tmp/s02-s09-pg',
                '-p', '55439', '-U', 'nobody', '-d', 'postgres', '-Atc',
                "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')) THEN 1/0 ELSE 1 END"], check=True)
CATALOG = json.loads((ROOT / 'catalog-before.json').read_text())
FUNCTIONS = '\n'.join(f['definition'].rstrip() + ';' for f in CATALOG['functions'])
SQL = (ROOT / 'positive-tests.sql').read_text() + '\n' + FUNCTIONS
SQL += '\nCREATE TRIGGER synthetic_trial AFTER INSERT ON public.synthetic_signup FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();\n'
# One outer transaction fixes now() so the exact day assertions are deterministic.
candidate = (ROOT / 'candidate.sql').read_text().replace('BEGIN;', '').replace('COMMIT;', '')
SQL += '\n' + candidate + '\n' + (ROOT / 'flows.sql').read_text()
subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-h', '/tmp/s02-s09-pg',
                '-p', '55439', '-U', 'nobody', '-d', 'postgres', '-1'], input=SQL, text=True, check=True)
print('PASS: synthetic positive SQL flows and static ACL checks; production untouched.')