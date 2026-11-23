"""Ensaio D2b numa PostgreSQL descartável. Dados fictícios."""
import sys, json
from datetime import date
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / '_ensaio'))
from pg import disposable, report

WS = '11111111-1111-4111-8111-111111111111'; U = '99999999-9999-4999-8999-999999999999'
month = date.today().strftime('%Y-%m')
P = [  # id, agreed, captação, edição, extras, entregue
  ('a0000000-0000-4000-8000-000000000001', 1000, 200, 100, 50, True),
  ('a0000000-0000-4000-8000-000000000002', 800, 0, 300, 0, True),
  ('a0000000-0000-4000-8000-000000000003', 500, 0, 0, 0, False),
]
L = [  # projeto, valor, estado
  (0, 70, 'pago'), (0, 30, 'cancelado'), (1, 120, 'pendente'), (1, 999, 'cancelado'), (2, 40, 'cancelado'),
]
def expected(i):  # regra do motor do cliente: linhas canceladas não contam
    pid, agreed, c1, c2, ex, _ = P[i]
    lines = sum(v for j, v, s in L if j == i and s != 'cancelado')
    return agreed - (c1 + c2 + ex + lines)
with disposable(55473) as db:
    db.sql(f'''
    CREATE TYPE payment_status AS ENUM ('pendente','pago','vencido','cancelado');
    CREATE FUNCTION is_system_admin() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
    CREATE TABLE workspace_members(workspace_id uuid, user_id uuid, is_active boolean);
    CREATE TABLE clients(id uuid PRIMARY KEY, name text);
    CREATE TABLE projects(id uuid PRIMARY KEY, name text, project_code text, workspace_id uuid, client_id uuid, is_delivered boolean,
      delivered_at timestamptz, delivery_date date, competence_month text, current_phase text, agreed_value numeric,
      custo_captacao numeric, custo_edicao numeric, custos_extras numeric, client_payment_status text, client_paid_at timestamptz,
      custos_extras_payment_status text, custos_extras_paid_at timestamptz, created_at timestamptz DEFAULT now(),
      item_type text, type text, priority text, shoot_date date);
    CREATE TABLE project_cost_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, actual_amount numeric, payment_status payment_status);
    INSERT INTO workspace_members VALUES ('{WS}','{U}',true);''')
    for pid, agreed, c1, c2, ex, deliv in P:
        db.sql(f"INSERT INTO projects(id,name,workspace_id,is_delivered,delivered_at,competence_month,current_phase,agreed_value,custo_captacao,custo_edicao,custos_extras,item_type) VALUES ('{pid}','Demo','{WS}',{str(deliv).lower()},{'now()' if deliv else 'NULL'},{repr(month) if deliv else 'NULL'},'edicao',{agreed},{c1},{c2},{ex},'projeto_completo')")
    for j, v, s in L:
        db.sql(f"INSERT INTO project_cost_lines(project_id,actual_amount,payment_status) VALUES ('{P[j][0]}',{v},'{s}')")
    db.file(here / 'rollback.sql')  # definições atuais
    def view_profits():
        return {r.split('|')[0]: float(r.split('|')[1]) for r in db.sql("SELECT id||'|'||profit FROM v_project_profit").splitlines()}
    def dash():
        out = db.sql(f"BEGIN; SET LOCAL request.jwt.claims='{{\"sub\":\"{U}\"}}'; SELECT get_dashboard_metrics('{WS}')::text; COMMIT;").splitlines()
        return json.loads(next(l for l in out if l.startswith('{')))
    exp = {P[i][0]: expected(i) for i in range(len(P))}
    exp_real = sum(P[i][1] for i in range(2)) - sum(P[i][1] - expected(i) for i in range(2))
    checks = []
    before_v = view_profits(); before_d = dash()['realizado_current']['profit']
    checks.append(('antes: vista difere do motor (defeito)', any(abs(before_v[k] - exp[k]) > 0.001 for k in exp)))
    checks.append(('antes: Dashboard difere do motor (defeito)', abs(float(before_d) - exp_real) > 0.001))
    db.file(here / 'candidate.sql')
    after_v = view_profits(); after_d = dash()['realizado_current']
    checks.append(('vista = motor em todos os projetos', all(abs(after_v[k] - exp[k]) < 0.001 for k in exp)))
    checks.append(('Dashboard realizado = motor', abs(float(after_d['profit']) - exp_real) < 0.001))
    checks.append(('receita e contagem inalteradas', float(after_d['revenue']) == 1800 and after_d['projectCount'] == 2))
    db.file(here / 'rollback.sql')
    checks.append(('rollback repõe valores anteriores', view_profits() == before_v and dash()['realizado_current']['profit'] == before_d))
    sys.exit(report(checks))
