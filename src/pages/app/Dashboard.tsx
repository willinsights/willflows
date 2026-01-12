import { useState, useEffect } from 'react';
import { ProductTour } from '@/components/tour/ProductTour';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KPICards } from '@/components/dashboard/KPICards';
import { FinancialChart } from '@/components/dashboard/FinancialChart';
import { UrgentProjectsCard } from '@/components/dashboard/UrgentProjectsCard';
import { PendingPaymentsCard } from '@/components/dashboard/PendingPaymentsCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics, UrgentProject } from '@/hooks/useDashboardMetrics';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ProjectDetailsModal } from '@/components/projects/ProjectDetailsModal';
import type { ProjectWithClient } from '@/hooks/useKanban';

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showTour, completeTour, skipTour } = useProductTour();
  const { metrics, urgentProjects, recentActivity, monthlyData, loading, refresh } = useDashboardMetrics();
  
  // State for project details modal
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: UrgentProject) => {
    // Convert UrgentProject to minimal ProjectWithClient for modal
    const projectForModal: ProjectWithClient = {
      id: project.id,
      name: project.name,
      type: project.type as 'fotografia' | 'video' | 'foto_video',
      priority: project.priority as 'baixa' | 'media' | 'alta' | 'urgente',
      current_phase: 'captacao',
      is_delivered: false,
      workspace_id: currentWorkspace?.id || '',
      created_at: '',
      updated_at: '',
      category: 'outro',
      clients: { name: project.client },
      delivery_date: project.date || null,
      agreed_value: null,
      custo_captacao: null,
      custo_edicao: null,
      client_id: null,
      shoot_date: null,
      shoot_start_time: null,
      shoot_end_time: null,
      address: null,
      city: null,
      country: null,
      region: null,
      captacao_column_id: null,
      edicao_column_id: null,
      notes: null,
      internal_notes: null,
      drive_folder_url: null,
      dropbox_folder_url: null,
      frameio_project_id: null,
      google_meet_url: null,
      estimated_costs: null,
      payment_method: null,
      delivered_at: null,
      created_by: null,
      custom_category_id: null,
      project_code: null,
      item_type: null,
      custos_extras: null,
      custos_extras_payment_status: null,
    };
    setSelectedProject(projectForModal);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-w-[1400px] mx-auto">
      {/* Product Tour */}
      {showTour && (
        <ProductTour onComplete={completeTour} onSkip={skipTour} />
      )}

      {/* Trial Banner */}
      <TrialBanner />
      
      {/* Header with greeting */}
      <DashboardHeader currentTime={currentTime} />

      {/* KPIs Row */}
      <KPICards metrics={metrics} loading={loading} />

      {/* Financial Chart */}
      <FinancialChart monthlyData={monthlyData} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Urgent Projects */}
        <UrgentProjectsCard 
          urgentProjects={urgentProjects} 
          loading={loading} 
          onProjectClick={handleProjectClick}
        />

        {/* Right Column - Stacked cards */}
        <div className="flex flex-col gap-3">
          <PendingPaymentsCard 
            pendingPayments={metrics.pendingPayments} 
            pendingPaymentsCount={metrics.pendingPaymentsCount} 
            loading={loading}
          />
          <RecentActivityCard 
            recentActivity={recentActivity} 
            loading={loading}
          />
        </div>
      </div>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={selectedProject}
        onUpdate={refresh}
      />
    </div>
  );
}
