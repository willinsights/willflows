-- Fixture only; no production credentials or payloads.
CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text);
CREATE TABLE conversations(id uuid PRIMARY KEY,name text);
CREATE TABLE conversation_members(conversation_id uuid,user_id uuid,is_muted boolean,is_active boolean);
CREATE TABLE messages(id uuid PRIMARY KEY,conversation_id uuid,user_id uuid,body text,type text,is_deleted boolean DEFAULT false);
ALTER TABLE push_notification_queue ADD user_id uuid, ADD title text, ADD body text, ADD data jsonb;
ALTER TABLE push_notification_queue ALTER COLUMN id SET DEFAULT gen_random_uuid();