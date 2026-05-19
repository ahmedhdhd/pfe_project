"use client";

import { useParams } from "next/navigation";
import { AssignmentEditorPage } from "@/components/assignments/assignment-editor-page";

export default function AdminAssignmentEditorRoute() {
  const params = useParams();
  return <AssignmentEditorPage role="admin" assignmentId={params.id as string} />;
}
