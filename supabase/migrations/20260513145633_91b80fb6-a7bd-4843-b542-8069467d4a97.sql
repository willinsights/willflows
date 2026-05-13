UPDATE workflow_automations
SET action_config = jsonb_set(
  action_config,
  '{body}',
  to_jsonb(replace(action_config->>'body', 'https://willflow.app/app/edicao', '{link_aprovacao}'))
)
WHERE action_config->>'body' LIKE '%willflow.app/app/edicao%';