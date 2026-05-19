"use client";

import { useState } from "react";
import { useGetAllUsers, useDeleteUser, useCurrentUser } from "@/hooks";
import { InviteUserModal } from "@/components/common/invite-user-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Users, UserPlus, Mail, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/common/page-header";

interface User {
  id: string;
  email: string;
  username: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { data: usersResponse, isLoading, error } = useGetAllUsers();
  const { data: currentUser } = useCurrentUser();
  const deleteUserMutation = useDeleteUser();

  const users: User[] = usersResponse?.data || [];

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUserMutation.mutateAsync(user.id);
      setUserToDelete(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleCancel = () => {
    setUserToDelete(null);
    setIsDialogOpen(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "TEACHER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "STUDENT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      case "TEACHER":
        return <Users className="h-4 w-4" />;
      case "STUDENT":
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load users</p>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Users"
        description="View and manage all users in your organization"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Users" },
        ]}
        actions={
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Total Users
              </p>
              <p className="text-xl font-bold">{users.length}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Verified Users
              </p>
              <p className="text-xl font-bold">
                {users.filter((user) => user.isVerified).length}
              </p>
            </div>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Admins
              </p>
              <p className="text-xl font-bold">
                {users.filter((user) => user.role === "ADMIN").length}
              </p>
            </div>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="sticky top-16 z-30 bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/60 border-b">
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage users in your organization. Click delete to remove a user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user?.username?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)}>
                      <span className="flex items-center space-x-1">
                        {getRoleIcon(user.role)}
                        <span>{user.role}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isVerified ? "default" : "secondary"}>
                      {user.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(user.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete User</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">
                              {userToDelete?.username}
                            </span>
                            ? This action cannot be undone and will permanently
                            remove the user and all their data from your
                            organization.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={handleCancel}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() =>
                              userToDelete && handleDeleteUser(userToDelete)
                            }
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteUserMutation.isPending}
                          >
                            {deleteUserMutation.isPending
                              ? "Deleting..."
                              : "Delete User"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      {currentUser?.organizationId && (
        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          organizationId={currentUser.organizationId}
        />
      )}
    </div>
  );
}
