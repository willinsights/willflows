import { ShotListSection } from './ShotListSection';
import { GalleriesSection } from './GalleriesSection';

export function PhotoTab({ projectId, workspaceId }: { projectId: string; workspaceId: string }) {
  return (
    <div className="space-y-4">
      <ShotListSection projectId={projectId} workspaceId={workspaceId} />
      <GalleriesSection projectId={projectId} workspaceId={workspaceId} />
    </div>
  );
}
