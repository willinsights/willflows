"""Ensaio D3 numa PostgreSQL descartável. Dados fictícios."""
import sys, json
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / '_ensaio'))
from pg import disposable, report

WS = '11111111-1111-4111-8111-111111111111'; WS2 = '22222222-2222-4222-8222-222222222222'
MGR = '99999999-9999-4999-8999-999999999991'; VIEW = '99999999-9999-4999-8999-999999999992'
PD = 'a0000000-0000-4000-8000-000000000001'; PN = 'a0000000-0000-4000-8000-000000000002'; PX = 'a0000000-0000-4000-8000-000000000003'
def t(n): return f'b0000000-0000-4000-8000-{n:012d}'
with disposable(55474) as db:
    db.sql(f'''
    CREATE TYPE payment_status AS ENUM ('pendente','pago','vencido','cancelado');
    CREATE TABLE workspace_members(workspace_id uuid, user_id uuid, role text, is_active boolean);
    CREATE TABLE workspace_role_permissions(workspace_id uuid, role text, permission_key text, enabled boolean);
    CREATE FUNCTION has_workspace_permission(_user_id uuid,_workspace_id uuid,_permission_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT COALESCE((SELECT wrp.enabled FROM workspace_role_permissions wrp JOIN workspace_members wm ON wm.workspace_id=wrp.workspace_id AND wm.role=wrp.role
        WHERE wm.user_id=_user_id AND wm.workspace_id=_workspace_id AND wm.is_active AND wrp.permission_key=_permission_key LIMIT 1), false) $$;
    CREATE TABLE projects(id uuid PRIMARY KEY, workspace_id uuid, is_delivered boolean);
    CREATE TABLE payment_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, file_path text NOT NULL, amount numeric NOT NULL DEFAULT 0, note text, created_by uuid NOT NULL, created_at timestamptz DEFAULT now());
    CREATE TABLE project_team(id uuid PRIMARY KEY, project_id uuid, payment_amount numeric, payment_status payment_status DEFAULT 'pendente', paid_at timestamptz, receipt_id uuid);
    INSERT INTO workspace_members VALUES ('{WS}','{MGR}','admin',true),('{WS}','{VIEW}','visualizador',true);
    INSERT INTO workspace_role_permissions VALUES ('{WS}','admin','payments.manage',true),('{WS}','visualizador','payments.manage',false);
    INSERT INTO projects VALUES ('{PD}','{WS}',true),('{PN}','{WS}',false),('{PX}','{WS2}',true);
    INSERT INTO project_team(id,project_id,payment_amount,payment_status) VALUES
      ('{t(1)}','{PD}',100,'pendente'),('{t(2)}','{PD}',250,'vencido'),('{t(3)}','{PD}',80,'pago'),
      ('{t(4)}','{PN}',60,'pendente'),('{t(5)}','{PX}',70,'pendente'),('{t(6)}','{PD}',0,'pendente');
    GRANT SELECT ON project_team, projects TO authenticated;''')
    db.file(here / 'candidate.sql')
    def pay(user, ids, total, path='NULL'):
        arr = "ARRAY[" + ",".join(f"'{i}'::uuid" for i in ids) + "]"
        return db.as_user(user, f"SELECT pay_team_batch('{WS}', {arr}, {total}, {path})")
    def state(): return db.sql("SELECT string_agg(right(id::text,1)||':'||payment_status||':'||coalesce(receipt_id::text,'-'),',' ORDER BY id) FROM project_team")
    s0 = state(); checks = []
    checks.append(('sem payments.manage: recusado', db.rejects(lambda: pay(VIEW, [t(1)], 100), 'BATCH_FORBIDDEN')))
    for name, ids, total, err in [
        ('item já pago no lote', [t(1), t(3)], 180, 'BATCH_ITEMS_NOT_PAYABLE'),
        ('projeto não entregue no lote', [t(1), t(4)], 160, 'BATCH_ITEMS_NOT_PAYABLE'),
        ('item de outro workspace no lote', [t(1), t(5)], 170, 'BATCH_ITEMS_NOT_PAYABLE'),
        ('valor zero no lote', [t(1), t(6)], 100, 'BATCH_ITEMS_NOT_PAYABLE'),
        ('total mudou desde o ecrã', [t(1), t(2)], 300, 'BATCH_TOTAL_CHANGED'),
        ('ids repetidos', [t(1), t(1)], 200, 'BATCH_INVALID_IDS'),
    ]:
        checks.append((f'falha parcial ({name}): nada pago', db.rejects(lambda i=ids, tt=total: pay(MGR, i, tt), err) and state() == s0))
    checks.append(('comprovativo fora do workspace recusado', db.rejects(lambda: pay(MGR, [t(1), t(2)], 350, f"'{WS2}/x.pdf'"), 'BATCH_RECEIPT_PATH') and state() == s0))
    checks.append(('nenhum comprovativo criado nas falhas', db.sql("SELECT count(*) FROM payment_receipts") == '0'))
    out = pay(MGR, [t(1), t(2)], 350, f"'{WS}/demo.pdf'")
    res = json.loads(next(l for l in out.splitlines() if l.startswith('{')))
    checks.append(('lote válido: 2 pagos, total 350', res['paid'] == 2 and float(res['total']) == 350))
    checks.append(('comprovativo com o total da base', db.sql("SELECT amount::int FROM payment_receipts") == '350'))
    rid = res['receipt_id']
    checks.append(('comprovativo ligado só aos pagos', db.sql(f"SELECT string_agg(right(id::text,1),',' ORDER BY id) FROM project_team WHERE receipt_id='{rid}'") == '1,2'))
    checks.append(('paid_at preenchido', db.sql(f"SELECT count(*) FROM project_team WHERE id IN ('{t(1)}','{t(2)}') AND paid_at IS NOT NULL") == '2'))
    checks.append(('repetir o mesmo lote: recusado (já pagos)', db.rejects(lambda: pay(MGR, [t(1), t(2)], 350), 'BATCH_ITEMS_NOT_PAYABLE')))
    checks.append(('anon não executa', db.rejects(lambda: db.sql(f"BEGIN; SET LOCAL ROLE anon; SELECT pay_team_batch('{WS}', ARRAY['{t(1)}'::uuid], 100); COMMIT;"), 'permission denied')))
    db.file(here / 'rollback.sql')
    checks.append(('rollback remove a função e mantém pagamentos', db.sql("SELECT count(*) FROM pg_proc WHERE proname='pay_team_batch'") == '0' and db.sql("SELECT count(*) FROM project_team WHERE payment_status='pago'") == '3'))
    sys.exit(report(checks))
