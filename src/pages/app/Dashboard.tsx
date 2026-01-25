import { useState, useEffect } from 'react';
import { ProductTour } from '@/components/tour/ProductTour';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { KPICards } from '@/components/dashboard/KPICards';
import { FinancialChart } from '@/components/dashboard/FinancialChart';
import { MonthlyGoalsCard } from '@/components/dashboard/MonthlyGoalsCard';
import { UrgentProjectsCard } from '@/components/dashboard/UrgentProjectsCard';
import { UpcomingEventsCard } from '@/components/dashboard/UpcomingEventsCard';
import { PendingPaymentsList } from '@/components/dashboard/PendingPaymentsList';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { PerformanceMetricsCard } from '@/components/dashboard/PerformanceMetricsCard';
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics, UrgentProject } from '@/hooks/useDashboardMetrics';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import type { ProjectWithClient } from '@/hooks/useKanban';

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const { canViewAllFinancials } = useFinancialPermissions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showTour, completeTour, skipTour } = useProductTour();
  const { 
    metrics, 
    performanceMetrics,
    urgentProjects, 
    recentActivity, 
    monthlyData, 
    upcomingEvents,
    annualComparison,
    pendingPaymentItems,
    loading, 
    refresh 
  } = useDashboardMetrics();
  
  // State for project details modal
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentYear = new Date().getFullYear();

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
      client_payment_status: null,
      client_payment_due_date: null,
      client_paid_at: null,
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
      
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <DashboardHeader currentTime={currentTime} />
        <QuickActionsCard />
      </div>

      {/* KPIs Row */}
      <KPICards metrics={metrics} loading={loading} />

      {/* Charts Row - Financial (with tabs) + Monthly Goals */}
      <div className="grid lg:grid-cols-2 gap-3">
        <FinancialChart 
          monthlyData={monthlyData} 
          annualComparison={annualComparison}
          loading={loading}
          currentYearLabel={String(currentYear)}
          previousYearLabel={String(currentYear - 1)}
        />
        {canViewAllFinancials && (
          <MonthlyGoalsCard 
            currentRevenue={metrics.receita}
            currentProjectsDelivered={metrics.entregues}
            loading={loading}
          />
        )}
      </div>

      {/* Projects and Events Row */}
      <div className="grid lg:grid-cols-2 gap-3">
        <UrgentProjectsCard 
          urgentProjects={urgentProjects} 
          loading={loading} 
          onProjectClick={handleProjectClick}
        />
        <UpcomingEventsCard 
          events={upcomingEvents} 
          loading={loading}
        />
      </div>

      {/* Bottom Row - Performance, Payments, Activity */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {canViewAllFinancials && (
          <PerformanceMetricsCard 
            metrics={performanceMetrics} 
            loading={loading}
          />
        )}
        <PendingPaymentsList 
          payments={pendingPaymentItems}
          totalAmount={metrics.pendingPayments}
          loading={loading}
        />
        <RecentActivityCard 
          recentActivity={recentActivity} 
          loading={loading}
        />
      </div>

      {/* Project Details Sheet */}
      <ProjectDetailsSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={selectedProject}
        onUpdate={refresh}
      />
    </div>
  );
}
