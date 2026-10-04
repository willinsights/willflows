
- Custo de pessoas: project_team é a fonte única; custo do card = COALESCE(cost_amount, payment_amount), somado em projects.custo_captacao/custo_edicao pelo trigger sync_project_people_costs; payment_amount só alimenta "a pagar/pago". Porque: separa custo no lucro de pagamento feito por terceiros, sem dupla contagem.
- Valores de project_team: SELECT só da própria linha ou com payments.view/can_edit_project; lista sem valores via RPC get_project_team_roster. Porque: colaboradores só vêem o próprio valor.
- Lucro por projeto: fórmula única = agreed_value − (custo_captacao + custo_edicao + custos_extras + soma de project_cost_lines.actual_amount); servidor via v_project_profit, cliente via getProjectCost. Porque: evita lucros diferentes entre ecrãs.
- Project details sheet: view/edit sub-panels and option lists live in src/components/projects/details/. Why: keeps the 900+ line sheet maintainable.
- Today view and Dashboard action zone share src/hooks/useTodayAgenda.ts. Why: one source for "what to do now".
- Closed months are enforced by DB triggers (closed_months); payment status changes stay allowed. Why: lock competência without blocking paying later.
