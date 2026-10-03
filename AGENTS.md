
- Custo de pessoas: project_team é a fonte única; projects.custo_captacao/custo_edicao são recalculados por trigger (sync_project_people_costs). Porque: evita valores divergentes e dupla contagem.
- Valores de project_team: SELECT só da própria linha ou com payments.view/can_edit_project; lista sem valores via RPC get_project_team_roster. Porque: colaboradores só vêem o próprio valor.
