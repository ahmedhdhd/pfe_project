"use client";

import { useParams } from "next/navigation";
import { AssignmentEditorPage } from "@/components/assignments/assignment-editor-page";

export default function TeacherAssignmentEditorRoute() {
  const params = useParams();
  return <AssignmentEditorPage role="teacher" assignmentId={params.id as string} />;
}
