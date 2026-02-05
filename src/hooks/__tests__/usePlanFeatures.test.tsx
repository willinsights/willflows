import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock all dependencies BEFORE importing the hook

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@example.com" },
    loading: false,
  })),
}));

// Mock WorkspaceContext
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: vi.fn(() => ({
    workspace: { id: "test-workspace-id", subscription_plan: "pro" },
    membership: { role: "admin" },
    loading: false,
  })),
}));

// Mock useSuperAdmin
vi.mock("@/hooks/useSuperAdmin", () => ({
  useSuperAdmin: vi.fn(() => ({
    isSuperAdmin: false,
    loading: false,
  })),
}));

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: "test-user-id", email: "test@example.com" } }, 
        error: null 
      })),
    },
  },
}));

// Mock useWorkspaceSubscription with different plans
const mockUseWorkspaceSubscription = vi.fn();
vi.mock("@/hooks/useWorkspaceSubscription", () => ({
  useWorkspaceSubscription: () => mockUseWorkspaceSubscription(),
}));

// Import hook after all mocks
import { usePlanFeatures, type FeatureKey } from "@/hooks/usePlanFeatures";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("usePlanFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for Pro plan
    mockUseWorkspaceSubscription.mockReturnValue({
      subscription: { plan: "pro" },
      limits: { workspaces: 3, users: 10, projects: 999, clients: 100 },
      loading: false,
      isOwner: true,
      canManageSubscription: true,
    });
  });

  describe("Pro Plan Tests", () => {
    it("should return current plan as pro", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.currentPlan).toBe("pro");
    });

    it("should return limits for pro plan", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.limits.workspaces).toBe(3);
      expect(result.current.limits.users).toBe(10);
      expect(result.current.limits.projects).toBe(999);
    });

    it("should check if feature is available based on plan", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Pro plan should have access to exportPdf (Pro feature)
      expect(result.current.hasFeatureAccess("exportPdf")).toBe(true);
      expect(result.current.hasFeatureAccess("googleCalendar")).toBe(true);
      expect(result.current.hasFeatureAccess("reportsAdvanced")).toBe(true);
      expect(result.current.hasFeatureAccess("chat")).toBe(true);
      
      // Pro plan should NOT have access to studio features
      expect(result.current.hasFeatureAccess("automations")).toBe(false);
      expect(result.current.hasFeatureAccess("automations")).toBe(false);
      expect(result.current.hasFeatureAccess("api")).toBe(false);
      expect(result.current.hasFeatureAccess("videoApproval")).toBe(false);
    });

    it("should return required plan for features", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Features available from starter
      expect(result.current.getRequiredPlan("workspaces")).toBe("starter");
      expect(result.current.getRequiredPlan("kanban")).toBe("starter");
      expect(result.current.getRequiredPlan("mediaHub")).toBe("starter");
      expect(result.current.getRequiredPlan("financialReports")).toBe("starter");
      expect(result.current.getRequiredPlan("calendar")).toBe("starter");
      
      // Features that require pro plan
      expect(result.current.getRequiredPlan("exportPdf")).toBe("pro");
      expect(result.current.getRequiredPlan("googleCalendar")).toBe("pro");
      expect(result.current.getRequiredPlan("chat")).toBe("pro");
      
      // Features that require studio plan
      expect(result.current.getRequiredPlan("automations")).toBe("studio");
      expect(result.current.getRequiredPlan("api")).toBe("studio");
      expect(result.current.getRequiredPlan("videoApproval")).toBe("studio");
    });

    it("should check feature and show upgrade alert when not available", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Initially, alert should be closed
      expect(result.current.upgradeAlert.isOpen).toBe(false);

      // Check a feature that requires studio plan
      act(() => {
        const canUse = result.current.checkFeature("videoApproval");
        expect(canUse).toBe(false);
      });

      // Alert should now be open
      expect(result.current.upgradeAlert.isOpen).toBe(true);
      expect(result.current.upgradeAlert.feature?.key).toBe("videoApproval");
      expect(result.current.upgradeAlert.requiredPlan).toBe("studio");
    });

    it("should close upgrade alert", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Trigger alert
      act(() => {
        result.current.checkFeature("videoApproval");
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
      expect(result.current.features.exportPdf.hasAccess).toBe(true);
      
      // Studio features should not be available for Pro plan
      expect(result.current.features.videoApproval.hasAccess).toBe(false);
    });
  });

  describe("Starter Plan Tests - CRITICAL Feature Gating", () => {
    beforeEach(() => {
      mockUseWorkspaceSubscription.mockReturnValue({
        subscription: { plan: "starter" },
        limits: { workspaces: 1, users: 2, projects: 20, clients: 20 },
        loading: false,
        isOwner: true,
        canManageSubscription: true,
      });
    });

    it("Starter: should have access to mediaHub (CRITICAL)", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("mediaHub")).toBe(true);
    });

    it("Starter: should have access to financialReports (CRITICAL)", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("financialReports")).toBe(true);
    });

    it("Starter: should have access to kanban", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("kanban")).toBe(true);
    });

    it("Starter: should have access to calendar", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("calendar")).toBe(true);
    });

    it("Starter: should NOT have access to chat", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("chat")).toBe(false);
    });

    it("Starter: should NOT have access to exportExcel", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("exportExcel")).toBe(false);
    });

    it("Starter: should NOT have access to exportPdf", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("exportPdf")).toBe(false);
    });

    it("Starter: should NOT have access to googleCalendar", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("googleCalendar")).toBe(false);
    });

    it("Starter: should NOT have access to videoApproval", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("videoApproval")).toBe(false);
    });
  });

  describe("Studio Plan Tests", () => {
    beforeEach(() => {
      mockUseWorkspaceSubscription.mockReturnValue({
        subscription: { plan: "studio" },
        limits: { workspaces: 10, users: 999, projects: 999, clients: 999 },
        loading: false,
        isOwner: true,
        canManageSubscription: true,
      });
    });

    it("Studio: should have access to ALL features including videoApproval", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("videoApproval")).toBe(true);
      expect(result.current.hasFeatureAccess("api")).toBe(true);
      expect(result.current.hasFeatureAccess("automations")).toBe(true);
    });

    it("Studio: should have access to all Pro features", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });
      expect(result.current.hasFeatureAccess("chat")).toBe(true);
      expect(result.current.hasFeatureAccess("exportExcel")).toBe(true);
      expect(result.current.hasFeatureAccess("exportPdf")).toBe(true);
      expect(result.current.hasFeatureAccess("googleCalendar")).toBe(true);
    });
  });

  describe("Super Admin Access", () => {
    beforeEach(() => {
      // Set Starter plan but Super Admin
      mockUseWorkspaceSubscription.mockReturnValue({
        subscription: { plan: "starter" },
        limits: { workspaces: 1, users: 2, projects: 20, clients: 20 },
        loading: false,
        isOwner: true,
        canManageSubscription: true,
      });
      
      vi.mocked(useSuperAdmin).mockReturnValue({
        isSuperAdmin: true,
        loading: false,
      });
    });

    it("Super Admin should have access to ALL features regardless of plan", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Even on Starter plan, Super Admin has access to everything
      expect(result.current.hasFeatureAccess("chat")).toBe(true);
      expect(result.current.hasFeatureAccess("exportExcel")).toBe(true);
      expect(result.current.hasFeatureAccess("exportPdf")).toBe(true);
      expect(result.current.hasFeatureAccess("googleCalendar")).toBe(true);
      expect(result.current.hasFeatureAccess("videoApproval")).toBe(true);
      expect(result.current.hasFeatureAccess("api")).toBe(true);
    });

    it("Super Admin canUseFeature should always return true", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      const features: FeatureKey[] = [
        "chat", "exportExcel", "exportPdf", "googleCalendar",
        "videoApproval", "api", "automations"
      ];

      features.forEach(feature => {
        expect(result.current.canUseFeature(feature)).toBe(true);
      });
    });

    it("Super Admin checkFeature should return true without showing alert", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      act(() => {
        const canUse = result.current.checkFeature("videoApproval");
        expect(canUse).toBe(true);
      });

      // Alert should NOT be shown for Super Admin
      expect(result.current.upgradeAlert.isOpen).toBe(false);
    });
  });

  describe("Feature Keys", () => {
    it("should have all feature keys defined", () => {
      const { result } = renderHook(() => usePlanFeatures(), {
        wrapper: createWrapper(),
      });

      // Core features
      expect(result.current.features.kanban).toBeDefined();
      expect(result.current.features.crmBasic).toBeDefined();
      expect(result.current.features.crmComplete).toBeDefined();
      expect(result.current.features.calendar).toBeDefined();
      expect(result.current.features.chat).toBeDefined();
      expect(result.current.features.mediaHub).toBeDefined();
      
      // Export features
      expect(result.current.features.exportExcel).toBeDefined();
      expect(result.current.features.exportPdf).toBeDefined();
      
      // Report features
      expect(result.current.features.reportsBasic).toBeDefined();
      expect(result.current.features.reportsAdvanced).toBeDefined();
      expect(result.current.features.financialReports).toBeDefined();
      
      // Integration features
      expect(result.current.features.googleCalendar).toBeDefined();
      expect(result.current.features.googleMeet).toBeDefined();
      expect(result.current.features.api).toBeDefined();
      
      // Studio features
      expect(result.current.features.videoApproval).toBeDefined();
      expect(result.current.features.automations).toBeDefined();
      expect(result.current.features.permissions).toBeDefined();
    });
  });
});
