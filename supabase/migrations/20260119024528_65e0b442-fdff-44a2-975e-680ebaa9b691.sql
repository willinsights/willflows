-- Recreate trigger for mention notifications
DROP TRIGGER IF EXISTS trigger_notify_on_mention ON public.message_mentions;

CREATE TRIGGER trigger_notify_on_mention
  AFTER INSERT ON public.message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mention();