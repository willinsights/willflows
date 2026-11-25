import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ReviewPageLoader } from '@/components/layout/ReviewPageLoader';
import { supabase } from '@/integrations/supabase/client';
import { videoApprovalReader } from '@/lib/video-approval-routing';
import { legacyVideoApprovalRequest } from '@/lib/legacy-video-approval-adapter';

const PrivateApproval = lazy(() => import('@/components/video-production/PrivateVideoApproval').then(m => ({ default: m.PrivateVideoApproval })));
async function privateRequest(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('private-video', { body });
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (error || !parsed || typeof parsed !== 'object' || parsed.code) throw new Error('PRIVATE_VIDEO_UNAVAILABLE');
  return parsed;
}
export default function VideoApprovalRouter() {
  const { token } = useParams<{ token: string }>();
  const reader = videoApprovalReader(token);
  if (reader === 'invalid' || !token) return <main className="min-h-screen bg-background p-6 text-foreground"><p role="alert">Este link não está disponível.</p></main>;
  return <>
    <Helmet><title>Revisão de vídeo</title><meta name="robots" content="noindex, nofollow"/><meta name="referrer" content="no-referrer"/></Helmet>
    <Suspense fallback={<ReviewPageLoader />}>
      <PrivateApproval key={token} token={token} request={reader === 'legacy' ? legacyVideoApprovalRequest : privateRequest} />
    </Suspense>
  </>;
}