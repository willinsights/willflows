-- Passo 1: Tornar user_id nullable
ALTER TABLE project_team ALTER COLUMN user_id DROP NOT NULL;

-- Passo 2: Adicionar coluna invitation_id
ALTER TABLE project_team ADD COLUMN invitation_id uuid REFERENCES workspace_invitations(id) ON DELETE SET NULL;

-- Passo 3: Adicionar coluna is_external
ALTER TABLE project_team ADD COLUMN is_external boolean DEFAULT false;

-- Passo 4: Adicionar coluna external_name  
ALTER TABLE project_team ADD COLUMN external_name text;