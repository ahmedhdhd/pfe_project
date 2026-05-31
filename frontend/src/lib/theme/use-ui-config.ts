"use client";

import { useMemo } from "react";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { legacyConfigToUiConfig, getHomepageLayout, homepageSectionVisible } from "./legacy-adapter";
import type { OrganizationUiConfig, UiHomepageSection } from "./schema";

export function useResolvedUiConfig(): OrganizationUiConfig {
  const config = useOrganizationConfigStore((s) => s.config);
  return useMemo(() => legacyConfigToUiConfig(config), [config]);
}

export function useHomepageLayout() {
  const ui = useResolvedUiConfig();
  return getHomepageLayout(ui);
}

export function useHomepageSectionVisible(section: UiHomepageSection) {
  const ui = useResolvedUiConfig();
  return homepageSectionVisible(ui, section);
}
