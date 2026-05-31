"use client";

import { useEffect } from "react";
import { useOrganizationConfigAdmin } from "@/hooks/api";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";

export function AdminOrgConfigSync() {
  const { data } = useOrganizationConfigAdmin();
  const setConfig = useOrganizationConfigStore((s) => s.setConfig);

  useEffect(() => {
    if (data?.success && data.data) {
      setConfig(data.data);
    }
  }, [data, setConfig]);

  return null;
}
