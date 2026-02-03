-- =====================================================
-- Migration: Replace hardcoded role checks with dynamic permissions
-- Affects: clients, client_communications, client_notes, contracts, 
--          contract_templates, categories, video_structures, 
--          video_structure_templates, activity_log
-- =====================================================

-- =====================================================
-- 1. CLIENTS TABLE
-- =====================================================

-- Drop existing hardcoded policies
DROP POLICY IF EXISTS "Admin, editor, captacao can view clients" ON clients;
DROP POLICY IF EXISTS "Members with editing rights can update lead status" ON clients;
DROP POLICY IF EXISTS "Admins and editors can manage clients" ON clients;
DROP POLICY IF EXISTS "Admin and editor can insert clients" ON clients;
DROP POLICY IF EXISTS "Admin and editor can delete clients" ON clients;

-- Create dynamic permission policies
CREATE POLICY "Members with view permission can view clients"
  ON clients FOR SELECT TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.view'));

CREATE POLICY "Members with edit permission can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

CREATE POLICY "Members with edit permission can create clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

CREATE POLICY "Members with edit permission can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- =====================================================
-- 2. CLIENT_COMMUNICATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Members with editing rights can manage communications" ON client_communications;
DROP POLICY IF EXISTS "Admin and editor can manage communications" ON client_communications;

CREATE POLICY "Members with client edit permission can manage communications"
  ON client_communications FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- =====================================================
-- 3. CLIENT_NOTES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Members with editing rights can manage notes" ON client_notes;
DROP POLICY IF EXISTS "Admin and editor can manage notes" ON client_notes;

CREATE POLICY "Members with client edit permission can manage notes"
  ON client_notes FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- =====================================================
-- 4. CONTRACTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admin and editor can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Admins and editors can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Members with editing rights can manage contracts" ON contracts;

CREATE POLICY "Members with contract permission can manage contracts"
  ON contracts FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'visibility.contracts'));

-- =====================================================
-- 5. CONTRACT_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admin and editor can manage templates" ON contract_templates;
DROP POLICY IF EXISTS "Admins and editors can manage templates" ON contract_templates;
DROP POLICY IF EXISTS "Members with editing rights can manage templates" ON contract_templates;

CREATE POLICY "Members with contract permission can manage templates"
  ON contract_templates FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'visibility.contracts'));

-- =====================================================
-- 6. CATEGORIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins and editors can manage categories" ON categories;
DROP POLICY IF EXISTS "Admin and editor can manage categories" ON categories;
DROP POLICY IF EXISTS "Members with editing rights can manage categories" ON categories;

CREATE POLICY "Members with client edit permission can manage categories"
  ON categories FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'clients.edit'));

-- =====================================================
-- 7. VIDEO_STRUCTURES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Members with editing rights can create video structures" ON video_structures;
DROP POLICY IF EXISTS "Admin, editor, captacao can create video structures" ON video_structures;

CREATE POLICY "Members with project edit permission can manage video structures"
  ON video_structures FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));

-- =====================================================
-- 8. VIDEO_STRUCTURE_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Members with editing rights can create templates" ON video_structure_templates;
DROP POLICY IF EXISTS "Admin, editor, captacao can create templates" ON video_structure_templates;
DROP POLICY IF EXISTS "Members with editing rights can manage templates" ON video_structure_templates;

CREATE POLICY "Members with project edit permission can manage video structure templates"
  ON video_structure_templates FOR ALL TO authenticated
  USING (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));

-- =====================================================
-- 9. ACTIVITY_LOG TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admin and editor can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Admins and editors can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Members with editing rights can insert activity log" ON activity_log;

CREATE POLICY "Members with project edit permission can insert activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (has_workspace_permission(auth.uid(), workspace_id, 'projects.edit'));