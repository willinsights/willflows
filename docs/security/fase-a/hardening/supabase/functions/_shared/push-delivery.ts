// Generic typed client calls only; no arbitrary SQL. Called after server authentication.
export async function deliverPush(client: any, notification: any, send: (subscription: any, payload: string) => Promise<unknown>) {
  const claim = await client.rpc('claim_push_delivery', { p_id: notification.id });
  if (claim.error) throw new Error('Push claim failed');
  if (!claim.data) return 'duplicate';
  const finish = async (state: string) => {
    const result = await client.rpc('finish_push_delivery', { p_id: notification.id, p_token: claim.data, p_state: state });
    if (result.error) throw new Error('Push completion failed; claim retained');
    return state;
  };
  const prefs = await client.from('user_push_preferences').select('push_enabled,push_subscription,messages_enabled').eq('user_id', notification.user_id).maybeSingle();
  if (prefs.error) return finish('retry'); // no provider request has started
  if (!prefs.data?.push_enabled || !prefs.data?.push_subscription || (['message', 'chat_message'].includes(notification.data?.type) && prefs.data.messages_enabled === false)) return finish('skipped');
  const sub = prefs.data.push_subscription;
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return finish('failed');
  let state = 'sent';
  try {
    const data = notification.data?.type === 'chat_message'
      ? { ...notification.data, type: 'message', entityId: notification.data.conversation_id }
      : notification.data || {};
    await send(sub, JSON.stringify({ title: notification.title, body: notification.body, tag: notification.tag || notification.id, data, icon: '/pwa-icon.png' }));
  } catch (error) {
    const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
    // Explicit rejection: safe to retry 429; transport/5xx are uncertain, never retry automatically.
    state = status === 429 ? 'retry' : status === 404 || status === 410 ? 'failed' : 'uncertain';
  }
  return finish(state);
}