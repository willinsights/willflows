import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock useUserSubscription
const mockSubscription = {
  subscription: {
    id: "sub-1",
    plan: "pro" as const,
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  },
  limits: {
    workspaces: 3,
    users: 10,
    projects: 100,
  },
  usage: {
    workspaces: 1,
    users: 3,
    projects: 15,
  },
  loading: false,
  error: null,
  refresh: vi.fn(),
};

vi.mock("@/hooks/useUserSubscription", () => ({
  useUserSubscription: vi.fn(() => mockSubscription),
}));

// Import hook after mocks
import { usePlanFeatures, FeatureKey } from "@/hooks/usePlanFeatures";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("usePlanFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return current plan", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentPlan).toBe("pro");
  });

  it("should return limits and usage", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    expect(result.current.limits.workspaces).toBe(3);
    expect(result.current.limits.users).toBe(10);
    expect(result.current.limits.projects).toBe(100);
    
    expect(result.current.usage.workspaces).toBe(1);
    expect(result.current.usage.users).toBe(3);
    expect(result.current.usage.projects).toBe(15);
  });

  it("should check if feature is available based on plan", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Pro plan should have access to exportPdf (Pro feature)
    expect(result.current.canUseFeature("exportPdf")).toBe(true);
    expect(result.current.canUseFeature("googleCalendar")).toBe(true);
    expect(result.current.canUseFeature("reportsAdvanced")).toBe(true);
    
    // Pro plan should NOT have access to studio features
    expect(result.current.canUseFeature("frameio")).toBe(false);
    expect(result.current.canUseFeature("automations")).toBe(false);
    expect(result.current.canUseFeature("api")).toBe(false);
  });

  it("should check feature access ignoring limits", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // hasFeatureAccess checks plan level only, not usage
    expect(result.current.hasFeatureAccess("exportPdf")).toBe(true);
    expect(result.current.hasFeatureAccess("frameio")).toBe(false);
  });

  it("should return required plan for features", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Features that require pro plan
    expect(result.current.getRequiredPlan("exportPdf")).toBe("pro");
    expect(result.current.getRequiredPlan("googleCalendar")).toBe("pro");
    
    // Features that require studio plan
    expect(result.current.getRequiredPlan("frameio")).toBe("studio");
    expect(result.current.getRequiredPlan("automations")).toBe("studio");
    expect(result.current.getRequiredPlan("api")).toBe("studio");
    
    // Features available from starter (essencial in DB)
    expect(result.current.getRequiredPlan("workspaces")).toBe("essencial");
    expect(result.current.getRequiredPlan("kanban")).toBe("essencial");
    expect(result.current.getRequiredPlan("exportExcel")).toBe("essencial");
  });

  it("should calculate remaining quota for limit-based features", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    expect(result.current.getRemainingQuota("workspaces")).toBe(2); // 3 - 1
    expect(result.current.getRemainingQuota("users")).toBe(7); // 10 - 3
    expect(result.current.getRemainingQuota("projects")).toBe(85); // 100 - 15
  });

  it("should check feature and show upgrade alert when not available", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Initially, alert should be closed
    expect(result.current.upgradeAlert.isOpen).toBe(false);

    // Check a feature that requires studio plan
    act(() => {
      const canUse = result.current.checkFeature("frameio");
      expect(canUse).toBe(false);
    });

    // Alert should now be open
    expect(result.current.upgradeAlert.isOpen).toBe(true);
    expect(result.current.upgradeAlert.feature?.key).toBe("frameio");
    expect(result.current.upgradeAlert.requiredPlan).toBe("studio");
  });

  it("should close upgrade alert", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Trigger alert
    act(() => {
      result.current.checkFeature("frameio");
    });
    expect(result.current.upgradeAlert.isOpen).toBe(true);

    // Close alert
    act(() => {
      result.current.closeUpgradeAlert();
    });
    expect(result.current.upgradeAlert.isOpen).toBe(false);
  });

  it("should return feature info", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    const featureInfo = result.current.getFeatureInfo("exportPdf");
    expect(featureInfo.key).toBe("exportPdf");
    expect(featureInfo.name).toBe("Exportação PDF");
    expect(featureInfo.minimumPlan).toBe("pro");
  });

  it("should provide features object with availability status", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Pro features should be available
    expect(result.current.features.exportPdf.available).toBe(true);
    expect(result.current.features.exportPdf.hasAccess).toBe(true);
    
    // Studio features should not be available for Pro plan
    expect(result.current.features.frameio.available).toBe(false);
    expect(result.current.features.frameio.hasAccess).toBe(false);
  });

  it("should detect limit-based feature restrictions", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Usage is below limit, so should be available
    expect(result.current.canUseFeature("workspaces")).toBe(true);
    expect(result.current.canUseFeature("users")).toBe(true);
    expect(result.current.canUseFeature("projects")).toBe(true);
  });

  it("should have new feature keys available", () => {
    const { result } = renderHook(() => usePlanFeatures(), {
      wrapper: createWrapper(),
    });

    // Check new feature keys are defined
    expect(result.current.features.kanban).toBeDefined();
    expect(result.current.features.crmBasic).toBeDefined();
    expect(result.current.features.crmComplete).toBeDefined();
    expect(result.current.features.calendar).toBeDefined();
    expect(result.current.features.exportExcel).toBeDefined();
    expect(result.current.features.reportsBasic).toBeDefined();
    expect(result.current.features.reportsAdvanced).toBeDefined();
    expect(result.current.features.templates).toBeDefined();
    expect(result.current.features.permissions).toBeDefined();
    expect(result.current.features.api).toBeDefined();
  });
});
