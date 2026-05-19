"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Eye,
  Edit,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  batchId: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SubjectDataTableProps {
  subjects: Subject[];
  basePath: "admin" | "teacher";
  courseId: string;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  canManageCourse: boolean;
}

export function SubjectDataTable({
  subjects,
  basePath,
  courseId,
  onEdit,
  onDelete,
  canManageCourse,
}: SubjectDataTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stripHtml = (html: string | undefined) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (subjectId: string) => {
    router.push(`/${basePath}/courses/${courseId}/subjects/${subjectId}`);
  };

  const handleCopyId = async (subjectId: string) => {
    try {
      await navigator.clipboard.writeText(subjectId);
      setCopiedId(subjectId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy ID:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px] max-w-[420px]">
                Subject
              </TableHead>
              <TableHead className="min-w-[200px]">Subject ID</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-muted-foreground"
                >
                  No subjects found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium max-w-[420px]">
                    <div className="line-clamp-2 wrap-break-word">
                      {subject.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-mono">
                        {subject.id}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopyId(subject.id)}
                        title="Copy Subject ID"
                      >
                        {copiedId === subject.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleView(subject.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canManageCourse && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(subject)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(subject)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default SubjectDataTable;
