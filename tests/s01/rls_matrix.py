import subprocess,json,re,hashlib
from pathlib import Path
BASE=['psql','-X','-h','127.0.0.1','-p','8004','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1']
records=[]
U=lambda n:f'11000000-0000-4000-8000-{n:012d}'
W=lambda n:f'22000000-0000-4000-8000-{n:012d}'
P=lambda n:f'33000000-0000-4000-8000-{n:012d}'
profiles=[('anon',None),('sem_workspace',1),('colaborador',2),('admin',3),('gestao',4),('super_admin',5),('service_role',None)]
def raw(q):
 p=subprocess.run(BASE+['-c',q],capture_output=True,text=True);return p.returncode,p.stdout.strip(),p.stderr.strip()
def case(id,prof,q,expected,judge):
 role='anon' if prof=='anon' else 'service_role' if prof=='service_role' else 'authenticated'
 n=dict(profiles).get(prof,6); claims={'role':role}
 if n:claims['sub']=U(n)
 setup=f"SET LOCAL ROLE {role}; SELECT set_config('request.jwt.claims','{json.dumps(claims)}',true);"
 rc,out,err=raw('BEGIN; '+setup+' '+q+'; ROLLBACK;')
 # suppress setup and transaction labels
 lines=[l for l in out.splitlines() if l not in ['BEGIN','SET','ROLLBACK'] and not l.startswith('{"role":')]
 evidence='\n'.join(lines)+(('\n'+err) if err else '')
 try: ok=judge(rc,lines,err)
 except:ok=False
 records.append(dict(id=id,perfil=prof,comando=q,esperado=expected,obtido=evidence,status='PASSOU' if ok else 'FALHOU'))
 return rc,lines,err
no_write=lambda rc,l,e: rc!=0 and ('permission denied' in e or 'row-level security' in e) or (rc==0 and ('UPDATE 0' in l or 'DELETE 0' in l))
def stage(s):
 for prof,n in profiles:case(s+'-G1-'+prof,prof,'SELECT public.is_service_role()', 'true antes (vulnerável); depois false para humanos, true serviço',lambda rc,l,e: rc==0 and l==(['t'] if s=='ANTES' or prof=='service_role' else ['f']))
 for prof,n in profiles[:-1]:
  case(s+'-G3-promote-'+prof,prof,f"INSERT INTO public.system_admins(user_id) VALUES ('{U(1)}') RETURNING user_id",'bloqueado depois; vulnerável antes', (lambda rc,l,e: rc==0) if s=='ANTES' else no_write)
  uid=U(n or 1)
  case(s+'-G3-sub-'+prof,prof,f"UPDATE public.user_subscriptions SET subscription_status='active' WHERE user_id='{uid}' RETURNING user_id",'bloqueado depois; vulnerável antes', (lambda rc,l,e: rc==0 and any('UPDATE 1'==x for x in l)) if s=='ANTES' else no_write)
 for prof in ['admin','gestao','colaborador','sem_workspace','super_admin']:
  case(s+'-G2-ownsub-'+prof,prof,f"SELECT count(*) FROM user_subscriptions WHERE user_id='{U(dict(profiles)[prof])}'",'1 subscrição própria',lambda rc,l,e:rc==0 and l==['1'])
 for kind,ws,table in [('projects-limit',3,'projects'),('clients-limit',3,'clients'),('expired-project',2,'projects'),('expired-client',2,'clients'),('inside-project',1,'projects'),('inside-client',1,'clients')]:
  for prof in ['admin' if ws==1 else 'limit_admin','service_role']:
   q=f"INSERT INTO public.{table}(workspace_id,name"+(',type' if table=='projects' else '')+f") VALUES ('{W(ws)}','Fict test'"+(",'video'" if table=='projects' else '')+") RETURNING name"
   blocked=s=='DEPOIS' and ws!=1 and prof!='service_role'
   case(s+'-G5-'+kind+'-'+prof,prof,q,'check_violation' if blocked else 'criado',lambda rc,l,e,b=blocked: (rc!=0 and ('Limite de 20' in e or 'subscrição deste workspace expirou' in e)) if b else rc==0 and 'Fict test' in l)
 for prof in ['admin','gestao','colaborador']:
  case(s+'-G7-board-'+prof,prof,f"SELECT jsonb_array_length(public.get_kanban_board('{W(1)}','captacao','{U(dict(profiles)[prof])}',false)->'columns') > 0",'colunas presentes',lambda rc,l,e:rc==0 and l==['t'])
 case(s+'-G7-move','admin',f"UPDATE projects SET current_phase='edicao' WHERE id='{P(101)}' RETURNING current_phase",'edicao; 1 linha',lambda rc,l,e:rc==0 and 'edicao' in l and 'UPDATE 1' in l)
 case(s+'-G7-deliver','admin',f"SELECT deliver_project('{P(101)}','edicao',(SELECT id FROM kanban_columns WHERE workspace_id='{W(1)}' AND phase='edicao' ORDER BY position DESC LIMIT 1),now())->>'can_deliver'; SELECT is_delivered FROM projects WHERE id='{P(101)}'",'true e is_delivered=t',lambda rc,l,e:rc==0 and l==['true','t'])
 case(s+'-G7-team','admin',f"UPDATE project_team SET cost_amount=70,payment_amount=60 WHERE project_id='{P(101)}' AND phase='edicao'; SELECT custo_captacao,custo_edicao FROM projects WHERE id='{P(101)}'; SELECT profit FROM v_project_profit WHERE id='{P(101)}'",'12|70; lucro 14',lambda rc,l,e:rc==0 and any(x in ['12|70','12.00|70.00'] for x in l) and any(x in ['14','14.00'] for x in l))
 case(s+'-G7-financial','admin',f"SELECT row_to_json(t) FROM get_workspace_financial_summary('{W(1)}') t",'resumo acessível',lambda rc,l,e:rc==0 and len(l)==1 and 'revenue_total' in l[0])
 for prof in ['admin','anon','service_role']:
  case(s+'-G7-token-'+prof,prof,"SELECT get_video_approval_token('77000000-0000-4000-8000-000000000001')",'falha owner anterior; não deve agravar',lambda rc,l,e:rc!=0 and 'invalid input value for enum app_role: "owner"' in e)
 case(s+'-S-DELIV','colaborador',f"SELECT deliver_project('{P(301)}','edicao',(SELECT id FROM kanban_columns WHERE workspace_id='{W(1)}' AND phase='edicao' ORDER BY position DESC LIMIT 1),now())->>'can_deliver'",'BLOQUEADO (crítico independente se permitido)',lambda rc,l,e:rc!=0 or l==['false'])
 # subscription invoices super admin read + deny write
 case(s+'-G4-read','super_admin',"SELECT count(*) FROM subscription_invoices",'3',lambda rc,l,e:rc==0 and l==['3'])
 for op,q in [('insert',f"INSERT INTO subscription_invoices(user_id,stripe_invoice_id,stripe_customer_id,amount_total,amount_subtotal) VALUES ('{U(5)}','fict-denied','fict',1,1)"),('update',"UPDATE subscription_invoices SET amount_total=1 RETURNING id"),('delete',"DELETE FROM subscription_invoices RETURNING id")]:case(s+'-G4-'+op,'super_admin',q,'bloqueado depois', (lambda rc,l,e:rc==0) if s=='ANTES' else no_write)
 # G2 all 14 tables, populated foreign rows. storage existing grants may fail even for service.
 tables=['promo_code_redemptions','promo_codes','public_access_attempts','push_notification_queue','stripe_webhook_log','subscription_discrepancies','subscription_invoices','system_admins','user_subscriptions','video_approval_tokens','video_approvals','video_comments','video_versions','storage.objects']
 for table in tables:
  full=table if '.' in table else 'public.'+table
  cols=['id','workspace_id','project_id'] if table=='video_approval_tokens' else ['id']
  selector='id' # metadata only on protected token
  for prof,n in profiles:
   # Exclude own records and permitted global admin readers; G2 exceptions explicit.
   filt='TRUE'
   if table in ['user_subscriptions','subscription_invoices','push_notification_queue']:filt=f"user_id='{U(6)}'"
   elif table=='system_admins':filt=f"user_id='{U(5)}'"
   elif table=='storage.objects':filt="name LIKE '%fict-s01%'"
   elif table in ['video_versions','video_comments','video_approvals','video_approval_tokens','subscription_discrepancies']:filt=f"workspace_id='{W(3)}'"
   elif table=='promo_codes':filt="code='FICTS01'"
   elif table=='public_access_attempts':filt="identifier='fict-s01'"
   elif table=='stripe_webhook_log':filt="event_id='fict-s01'"
   elif table=='promo_code_redemptions':filt=f"user_id='{U(6)}'"
   global_read=prof=='super_admin' and table in ['system_admins','user_subscriptions','subscription_invoices','promo_codes','subscription_discrepancies','stripe_webhook_log','promo_code_redemptions']
   permitted=prof=='service_role' or global_read
   case(s+'-G2-read-'+table+'-'+prof,prof,f"SELECT count({selector}) FROM {full} WHERE {filt}",'foreign rows visible' if permitted or s=='ANTES' else '0 ou accès refusé',lambda rc,l,e,p=permitted: (rc==0 and int(l[0])>0) if p else (True if s=='ANTES' else (rc!=0 and 'permission denied' in e or rc==0 and l==['0'])))
   case(s+'-G2-update-'+table+'-'+prof,prof,f"UPDATE {full} SET id=id WHERE {filt} RETURNING id",'serviço escreve; humanos bloqueados (Super Admin promo conforme regra existente)',lambda rc,l,e,p=prof,t=table: (rc==0 and any(x.startswith('UPDATE ') and x!='UPDATE 0' for x in l)) if p=='service_role' or (p=='super_admin' and t in ['promo_codes','subscription_discrepancies']) else (True if s=='ANTES' else no_write(rc,l,e)))
 Path('/tmp/s01/'+s+'.json').write_text(json.dumps(records,indent=2,ensure_ascii=False))
if __name__=='__main__':
 import sys
 stage(sys.argv[1]); print('records',len(records),'failed',sum(r['status']=='FALHOU' for r in records))
