import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ProductTour } from '@/components/tour/ProductTour';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { ProjectCounters } from '@/components/dashboard/ProjectCounters';
import { FinancialForecastCards } from '@/components/dashboard/FinancialForecastCards';
import { FinancialViewSelector } from '@/components/dashboard/FinancialViewSelector';
import { MonthlySummaryBar } from '@/components/dashboard/MonthlySummaryBar';
import { CollaboratorForecastCards } from '@/components/dashboard/CollaboratorForecastCards';
import { FinancialChart } from '@/components/dashboard/FinancialChart';
import { MonthlyGoalsCard } from '@/components/dashboard/MonthlyGoalsCard';
import { UrgentProjectsCard } from '@/components/dashboard/UrgentProjectsCard';
import { UpcomingEventsCard } from '@/components/dashboard/UpcomingEventsCard';
import { PendingPaymentsList } from '@/components/dashboard/PendingPaymentsList';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { PerformanceMetricsCard } from '@/components/dashboard/PerformanceMetricsCard';
import { PaymentAlertsWidget } from '@/components/dashboard/PaymentAlertsWidget';
import { WorkspaceHealthWidget } from '@/components/dashboard/WorkspaceHealthWidget';
import { AdvancedKPIWidget } from '@/components/dashboard/AdvancedKPIWidget';
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics, UrgentProject } from '@/hooks/useDashboardMetrics';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import type { ProjectWithClient } from '@/hooks/useKanban';
import type { FinancialViewMode } from '@/lib/finance/types';

// Mobile-specific components
import { MobileKPICarousel } from '@/components/mobile/MobileKPICarousel';
import { MobileFinancialSummary } from '@/components/mobile/MobileFinancialSummary';
import { MobileGoalsSummary } from '@/components/mobile/MobileGoalsSummary';
import { MobileUrgentProjects } from '@/components/mobile/MobileUrgentProjects';
import { MobileUpcomingEvents } from '@/components/mobile/MobileUpcomingEvents';
import { MobilePendingPayments } from '@/components/mobile/MobilePendingPayments';
import { MobileRecentActivity } from '@/components/mobile/MobileRecentActivity';
import { MobileCollaboratorForecast } from '@/components/mobile/MobileCollaboratorForecast';

const VIEW_MODE_KEY = 'wf_financial_view_mode';

function getInitialViewMode(): FinancialViewMode {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('view')?.toUpperCase();
    if (fromUrl === 'REALIZADO' || fromUrl === 'PREVISAO' || fromUrl === 'CAIXA') return fromUrl;
    const stored = localStorage.getItem(VIEW_MODE_KEY) as FinancialViewMode | null;
    if (stored === 'REALIZADO' || stored === 'PREVISAO' || stored === 'CAIXA') return stored;
  } catch {}
  return 'PREVISAO';
}

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const { canViewAllFinancials, isCollaborator } = useFinancialPermissions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showTour, completeTour, skipTour } = useProductTour();
  const isMobile = useIsMobile();

  // Financial view mode state
  const [viewMode, setViewMode] = useState<FinancialViewMode>(getInitialViewMode);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const handleViewModeChange = useCallback((mode: FinancialViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode.toLowerCase());
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Financial engine (unified metrics)
  const {
    metrics: engineMetrics,
    summary,
    timeSeries,
    revenueChange,
    costChange,
    profitChange,
    loading: engineLoading,
  } = useFinancialEngine(viewMode, selectedMonth);

  // Legacy dashboard metrics (for non-financial data: urgent projects, events, activity, etc.)
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

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth(new Date());
  }, []);

  const handleProjectClick = (project: UrgentProject) => {
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
      updated_by: null,
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
      custos_extras_paid_at: null,
      client_payment_status: null,
      client_payment_due_date: null,
      client_paid_at: null,
      competence_month: null,
    };
    setSelectedProject(projectForModal);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Mobile Dashboard Layout
  if (isMobile) {
    return (
      <div className="p-4 space-y-4 pb-24">
        {showTour && (
          <ProductTour onComplete={completeTour} onSkip={skipTour} />
        )}
        <TrialBanner />
        <DashboardHeader currentTime={currentTime} />
        <MobileKPICarousel metrics={metrics} loading={loading} />
        {!isCollaborator && canViewAllFinancials && (
          <>
            <MobileFinancialSummary
              monthlyData={monthlyData}
              annualComparison={annualComparison}
              loading={loading}
              currentYearLabel={String(currentYear)}
              previousYearLabel={String(currentYear - 1)}
            />
            <MobileGoalsSummary
              currentRevenue={metrics.receita}
              currentProjectsDelivered={metrics.entregues}
              loading={loading}
            />
          </>
        )}
        {isCollaborator && (
          <MobileCollaboratorForecast />
        )}
        <MobileUrgentProjects
          urgentProjects={urgentProjects}
          loading={loading}
          onProjectClick={handleProjectClick}
          maxItems={3}
        />
        <MobileUpcomingEvents
          events={upcomingEvents}
          loading={loading}
          maxItems={3}
          onRefresh={refresh}
        />
        {!isCollaborator && canViewAllFinancials && (
          <MobilePendingPayments
            payments={pendingPaymentItems}
            totalAmount={metrics.pendingPayments}
            loading={loading}
            maxItems={3}
          />
        )}
        <MobileRecentActivity
          recentActivity={recentActivity}
          loading={loading}
          maxItems={4}
        />
        <ProjectDetailsSheet
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          project={selectedProject}
          onUpdate={refresh}
        />
      </div>
    );
  }

  // Desktop Dashboard Layout
  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

  return (
    <motion.div
      className="p-3 md:p-4 space-y-3 md:space-y-4 max-w-[1400px] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {showTour && (
        <ProductTour onComplete={completeTour} onSkip={skipTour} />
      )}
      <TrialBanner />
      
      {/* Header with Quick Actions */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <DashboardHeader currentTime={currentTime} />
        <QuickActionsCard />
      </motion.div>

      {/* Project Counters Row */}
      <motion.div variants={fadeUp}>
        <ProjectCounters metrics={metrics} loading={loading} />
      </motion.div>

      {/* Financial View Selector + Forecast Cards - Only for admins */}
      {!isCollaborator && canViewAllFinancials && (
        <>
          <FinancialViewSelector value={viewMode} onChange={handleViewModeChange} />
          <FinancialForecastCards
            viewMode={viewMode}
            metrics={engineMetrics}
            revenueChange={revenueChange}
            costChange={costChange}
            profitChange={profitChange}
            loading={engineLoading}
            selectedMonth={selectedMonth}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onCurrentMonth={goToCurrentMonth}
          />
          <MonthlySummaryBar summary={summary} loading={engineLoading} />
        </>
      )}

      {/* Collaborator Forecast Row - Only for collaborators */}
      {isCollaborator && (
        <CollaboratorForecastCards />
      )}

      {/* Charts Row */}
      {!isCollaborator && (
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-3">
          <FinancialChart 
            monthlyData={monthlyData} 
            annualComparison={annualComparison}
            loading={loading || engineLoading}
            currentYearLabel={String(currentYear)}
            previousYearLabel={String(currentYear - 1)}
            viewMode={viewMode}
            timeSeries={timeSeries}
          />
          {canViewAllFinancials && (
            <MonthlyGoalsCard 
              currentRevenue={metrics.receita}
              currentProjectsDelivered={metrics.entregues}
              loading={loading}
            />
          )}
        </motion.div>
      )}

      {/* Projects and Events Row */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-3">
        <UrgentProjectsCard 
          urgentProjects={urgentProjects} 
          loading={loading} 
          onProjectClick={handleProjectClick}
        />
        <UpcomingEventsCard 
          events={upcomingEvents} 
          loading={loading}
          onRefresh={refresh}
        />
      </motion.div>

      {/* Payment Alerts + Workspace Health + Advanced KPIs */}
      {!isCollaborator && canViewAllFinancials && (
        <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-3">
          <PaymentAlertsWidget />
          <WorkspaceHealthWidget />
          <AdvancedKPIWidget />
        </motion.div>
      )}

      {/* Bottom Row */}
      <motion.div variants={fadeUp} className={`grid gap-3 ${canViewAllFinancials ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
        {canViewAllFinancials && (
          <PerformanceMetricsCard 
            metrics={performanceMetrics} 
            loading={loading}
          />
        )}
        {!isCollaborator && (
          <PendingPaymentsList 
            payments={pendingPaymentItems}
            totalAmount={metrics.pendingPayments}
            loading={loading}
          />
        )}
        <RecentActivityCard 
          recentActivity={recentActivity} 
          loading={loading}
        />
      </motion.div>

      <ProjectDetailsSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={selectedProject}
        onUpdate={refresh}
      />
    </motion.div>
  );
}
