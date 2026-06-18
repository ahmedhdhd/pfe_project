"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  Mail,
  Search,
  ShieldCheck,
  Users,
} from "@/components/icons";
import { useGetAllBatches, useGetAllUsers } from "@/hooks";
import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeacherStudentUser {
  id: string;
  email?: string | null;
  username: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isVerified: boolean;
  createdAt: string;
}

interface TeacherStudentBatch {
  id: string;
  name: string;
  _count?: {
    enrollments?: number;
  };
}

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState("");
  const { data: usersResponse, isLoading: isLoadingUsers } = useGetAllUsers();
  const { data: batchesResponse, isLoading: isLoadingBatches } =
    useGetAllBatches();

  const users = ((usersResponse?.data as TeacherStudentUser[] | undefined) ??
    []) as TeacherStudentUser[];
  const batches = ((batchesResponse?.data as TeacherStudentBatch[] | undefined) ??
    []) as TeacherStudentBatch[];

  const students = useMemo(
    () => users.filter((user) => user.role === "STUDENT"),
    [users]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const username = student.username.toLowerCase();
      const email = (student.email || "").toLowerCase();
      return username.includes(query) || email.includes(query);
    });
  }, [search, students]);

  const totalEnrollments = useMemo(
    () =>
      batches.reduce(
        (sum, batch) => sum + (batch._count?.enrollments || 0),
        0
      ),
    [batches]
  );

  const verifiedStudents = useMemo(
    () => students.filter((student) => student.isVerified).length,
    [students]
  );

  const isLoading = isLoadingUsers || isLoadingBatches;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Review the learners in your organization and quickly search the current student roster."
        breadcrumbs={[
          { label: "Teacher", href: "/teacher/dashboard" },
          { label: "Students" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-semibold">{students.length}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-semibold">{verifiedStudents}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Course Enrollments</p>
              <p className="text-2xl font-semibold">{totalEnrollments}</p>
            </div>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Student Directory</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredStudents.length} student
                {filteredStudents.length === 1 ? "" : "s"} shown
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by student name or email"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No students found</p>
                <p className="text-sm text-muted-foreground">
                  Try changing the search term or invite students to the
                  platform.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {student.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Student ID: {student.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{student.email || "No email"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={student.isVerified ? "default" : "secondary"}
                      >
                        {student.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(student.createdAt), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
