"use client";

import { PageHeader } from "@/components/common/page-header";
import { CategoryManagement } from "@/components/courses/category-management";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage course and exam categories, subcategories, and icons."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Categories" },
        ]}
      />

      <CategoryManagement />
    </div>
  );
}
