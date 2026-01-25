-- Fix the sync_project_chat_member trigger to handle pending invitations (null user_id)
CREATE OR REPLACE FUNCTION public.sync_project_chat_member()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Skip if user_id is null (pending invitation - they'll be added when they accept)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the project chat
  SELECT id INTO v_conversation_id 
  FROM public.conversations 
  WHERE project_id = NEW.project_id AND type = 'project';
  
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, NEW.user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the convert_invitation_to_member function to add user to project chats when they accept
CREATE OR REPLACE FUNCTION convert_invitation_to_member()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_conversation_id UUID;
  v_project_record RECORD;
BEGIN
  -- Only run when invitation is accepted
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    -- Find the user by email hash
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE encode(digest(email, 'sha256'), 'hex') = NEW.email_hash;
    
    IF v_user_id IS NOT NULL THEN
      -- Update project_team records: convert invitation_id to user_id
      FOR v_project_record IN 
        SELECT pt.project_id 
        FROM project_team pt 
        WHERE pt.invitation_id = NEW.id
      LOOP
        -- Update the team record
        UPDATE project_team 
        SET user_id = v_user_id, invitation_id = NULL
        WHERE invitation_id = NEW.id AND project_id = v_project_record.project_id;
        
        -- Add user to project chat if exists
        SELECT id INTO v_conversation_id 
        FROM conversations 
        WHERE project_id = v_project_record.project_id AND type = 'project';
        
        IF v_conversation_id IS NOT NULL THEN
          INSERT INTO conversation_members (conversation_id, user_id, role)
          VALUES (v_conversation_id, v_user_id, 'member')
          ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;