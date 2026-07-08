import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ProductTour } from '@/components/tour/ProductTour';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useHideValues } from '@/hooks/useHideValues';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { ProjectCounters } from '@/components/dashboard/ProjectCounters';
import { FinancialForecastCards } from '@/components/dashboard/FinancialForecastCards';
import { FinancialViewSelector } from '@/components/dashboard/FinancialViewSelector';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
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
import { WelcomeWizard } from '@/components/onboarding/WelcomeWizard';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { useProductTour } from '@/hooks/useProductTour';
import { useDashboardMetrics, UrgentProject } from '@/hooks/useDashboardMetrics';
import { useFinancialEngine } from '@/hooks/useFinancialEngine';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProjectDetailsSheet } from '@/components/projects/ProjectDetailsSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
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

/** Discreet uppercase zone title used consistently across the dashboard. */
function ZoneTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-1">
      {children}
    </h2>
  );
}

/** Dashboard page header — greeting + hide-values + quick actions. */
function DashboardPageHeader({ currentTime }: { currentTime: Date }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { hideValues, toggleHideValues } = useHideValues();

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };
  const userName = user?.user_metadata?.full_name || currentWorkspace?.name || 'Utilizador';
  const firstName = userName.split(' ')[0];
  const formattedDate = format(currentTime, "EEEE, d 'de' MMMM", { locale: pt });
  const formattedTime = format(currentTime, 'HH:mm');

  return (
    <PageHeader
      title={
        <>
          {getGreeting()}, <span className="gradient-text">{firstName}</span>!
        </>
      }
      description={<span className="capitalize">{formattedDate} • {formattedTime}</span>}
      actions={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleHideValues}
                className="h-8 w-8 p-0"
              >
                {hideValues ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{hideValues ? 'Mostrar valores' : 'Esconder valores'}</p>
            </TooltipContent>
          </Tooltip>
          <QuickActionsCard />
        </>
      }
    />
  );
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

  // Single financial source of truth
  const {
    metrics: engineMetrics,
    summary,
    timeSeries,
    revenueChange,
    costChange,
    profitChange,
    loading: engineLoading,
  } = useFinancialEngine(viewMode, selectedMonth);

  // Non-financial data + legacy shape for widgets that still need it
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
    refresh,
  } = useDashboardMetrics();

  // Project details sheet state
  const [selectedProject, setSelectedProject] = useState<ProjectWithClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);

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

  const handleProjectClick = useCallback(async (project: UrgentProject) => {
    setLoadingProject(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', project.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error('Projeto não encontrado');
        return;
      }
      setSelectedProject(data as ProjectWithClient);
      setIsModalOpen(true);
    } catch (err) {
      logger.error('[dashboard] failed to load project', err);
      toast.error('Não foi possível abrir o projeto');
    } finally {
      setLoadingProject(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showFinancialZone = !isCollaborator && canViewAllFinancials;

  // ============ MOBILE LAYOUT ============
  if (isMobile) {
    return (
      <div className="p-4 space-y-8 pb-24">
        {showTour && <ProductTour onComplete={completeTour} onSkip={skipTour} />}
        <TrialBanner />
        <WelcomeWizard />
        <OnboardingChecklist />
        <DashboardHeader currentTime={currentTime} />

        {/* Zone 1: Visão do mês */}
        <section className="space-y-4">
          <ZoneTitle>Visão do mês</ZoneTitle>
          <MobileKPICarousel metrics={metrics} loading={loading} />
          {showFinancialZone && (
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
          {isCollaborator && <MobileCollaboratorForecast />}
        </section>

        {/* Zone 2: Precisa de ação */}
        <section className="space-y-4">
          <ZoneTitle>Precisa de ação</ZoneTitle>
          <MobileUrgentProjects
            urgentProjects={urgentProjects}
            loading={loading || loadingProject}
            onProjectClick={handleProjectClick}
            maxItems={3}
          />
          {showFinancialZone && (
            <MobilePendingPayments
              payments={pendingPaymentItems}
              totalAmount={metrics.pendingPayments}
              loading={loading}
              maxItems={3}
            />
          )}
          <MobileUpcomingEvents
            events={upcomingEvents}
            loading={loading}
            maxItems={3}
            onRefresh={refresh}
          />
          {showFinancialZone && <PaymentAlertsWidget />}
        </section>

        {/* Zone 3: Insights */}
        <section className="space-y-4">
          <ZoneTitle>Insights</ZoneTitle>
          {showFinancialZone && (
            <>
              <WorkspaceHealthWidget />
              <AdvancedKPIWidget />
            </>
          )}
          <MobileRecentActivity
            recentActivity={recentActivity}
            loading={loading}
            maxItems={4}
          />
        </section>

        <ProjectDetailsSheet
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          project={selectedProject}
          onUpdate={refresh}
        />
      </div>
    );
  }

  // ============ DESKTOP LAYOUT ============
  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

  return (
    <motion.div
      className="p-3 md:p-4 space-y-8 max-w-[1400px] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {showTour && <ProductTour onComplete={completeTour} onSkip={skipTour} />}
      <TrialBanner />
      <WelcomeWizard />
      <motion.div variants={fadeUp}>
        <OnboardingChecklist />
      </motion.div>

      {/* Page header with greeting + Quick Actions */}
      <motion.div variants={fadeUp}>
        <DashboardPageHeader currentTime={currentTime} />
      </motion.div>

      {/* ============ ZONE 1: Visão do mês ============ */}
      <motion.section variants={fadeUp} className="space-y-4">
        <ZoneTitle>Visão do mês</ZoneTitle>

        {/* Project counters as compact KPIs */}
        <ProjectCounters metrics={metrics} loading={loading} />

        {showFinancialZone && (
          <>
            {/* Unified control bar: view selector + month picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
              <FinancialViewSelector value={viewMode} onChange={handleViewModeChange} />
              <MonthPicker
                selectedMonth={selectedMonth}
                onPrevious={goToPreviousMonth}
                onNext={goToNextMonth}
                onToday={goToCurrentMonth}
              />
            </div>

            {/* 3 forecast KPIs (engine-driven) */}
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
              hideMonthPicker
            />

            {/* Chart (2/3) + Goals (1/3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="md:col-span-2 lg:col-span-2">
                <FinancialChart
                  monthlyData={monthlyData}
                  annualComparison={annualComparison}
                  loading={engineLoading}
                  currentYearLabel={String(currentYear)}
                  previousYearLabel={String(currentYear - 1)}
                  viewMode={viewMode}
                  timeSeries={timeSeries}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <MonthlyGoalsCard
                  currentRevenue={metrics.receita}
                  currentProjectsDelivered={metrics.entregues}
                  loading={loading}
                />
              </div>
            </div>

            {/* Monthly summary strip closes zone 1 */}
            <MonthlySummaryBar summary={summary} loading={engineLoading} />
          </>
        )}

        {isCollaborator && <CollaboratorForecastCards />}
      </motion.section>

      {/* ============ ZONE 2: Precisa de ação ============ */}
      <motion.section variants={fadeUp} className="space-y-4">
        <ZoneTitle>Precisa de ação</ZoneTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <UrgentProjectsCard
            urgentProjects={urgentProjects}
            loading={loading || loadingProject}
            onProjectClick={handleProjectClick}
          />
          {showFinancialZone ? (
            <PendingPaymentsList
              payments={pendingPaymentItems}
              totalAmount={metrics.pendingPayments}
              loading={loading}
            />
          ) : (
            <UpcomingEventsCard events={upcomingEvents} loading={loading} onRefresh={refresh} />
          )}
          {showFinancialZone && (
            <UpcomingEventsCard events={upcomingEvents} loading={loading} onRefresh={refresh} />
          )}
        </div>
        {showFinancialZone && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
            <PaymentAlertsWidget />
          </div>
        )}
      </motion.section>

      {/* ============ ZONE 3: Insights ============ */}
      <motion.section variants={fadeUp} className="space-y-4">
        <ZoneTitle>Insights</ZoneTitle>
        <div className={`grid gap-3 ${showFinancialZone ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
          {showFinancialZone && (
            <PerformanceMetricsCard metrics={performanceMetrics} loading={loading} />
          )}
          {showFinancialZone && <WorkspaceHealthWidget />}
          {showFinancialZone && <AdvancedKPIWidget />}
          <RecentActivityCard recentActivity={recentActivity} loading={loading} />
        </div>
      </motion.section>

      <ProjectDetailsSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={selectedProject}
        onUpdate={refresh}
      />
    </motion.div>
  );
}
