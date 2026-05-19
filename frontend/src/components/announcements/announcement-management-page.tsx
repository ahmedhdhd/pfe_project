"use client";

import { useMemo, useState } from "react";
import {
  Megaphone,
  Send,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import {
  useCreateAnnouncement,
  useGetAllBatches,
  useGetAnnouncements,
} from "@/hooks";

type AnnouncementAudienceType = "ORGANIZATION" | "COURSE";

interface BatchOption {
  id: string;
  name: string;
}

interface AnnouncementItem {
  id: string;
  subject: string;
  contentHtml: string;
  audienceType: AnnouncementAudienceType;
  recipientCount: number;
  createdAt: string;
  batch?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    username: string;
    role?: string;
  } | null;
}

interface AnnouncementManagementPageProps {
  basePath: "admin" | "teacher";
}

export function AnnouncementManagementPage({
  basePath,
}: AnnouncementManagementPageProps) {
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [audienceType, setAudienceType] =
    useState<AnnouncementAudienceType>("ORGANIZATION");
  const [batchId, setBatchId] = useState("");

  const createAnnouncement = useCreateAnnouncement();
  const { data: batchesResponse } = useGetAllBatches();
  const { data: announcementsResponse, isLoading: announcementsLoading } =
    useGetAnnouncements();

  const batches = useMemo(
    () => ((batchesResponse?.data as BatchOption[] | undefined) ?? []),
    [batchesResponse?.data]
  );
  const announcements = useMemo(
    () => ((announcementsResponse?.data as AnnouncementItem[] | undefined) ?? []),
    [announcementsResponse?.data]
  );

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error("Announcement subject is required.");
      return;
    }

    if (!contentHtml.trim()) {
      toast.error("Announcement content is required.");
      return;
    }

    if (audienceType === "COURSE" && !batchId) {
      toast.error("Select a course audience first.");
      return;
    }

    try {
      await createAnnouncement.mutateAsync({
        subject: subject.trim(),
        contentHtml,
        audienceType,
        batchId: audienceType === "COURSE" ? batchId : undefined,
      });

      setSubject("");
      setContentHtml("");
      setAudienceType("ORGANIZATION");
      setBatchId("");
      toast.success("Announcement sent successfully.");
    } catch (error) {
      console.error("Failed to send announcement:", error);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message
          : "Unable to send the announcement.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Send announcement emails to all students in the organization or only the students enrolled in a course."
        breadcrumbs={[
          {
            label: basePath === "admin" ? "Admin" : "Teacher",
            href: `/${basePath}/dashboard`,
          },
          { label: "Announcements" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={audienceType}
                  onValueChange={(value: AnnouncementAudienceType) => {
                    setAudienceType(value);
                    if (value !== "COURSE") {
                      setBatchId("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">
                      All students in the organization
                    </SelectItem>
                    <SelectItem value="COURSE">
                      Students enrolled in a course
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  value={batchId || undefined}
                  onValueChange={setBatchId}
                  disabled={audienceType !== "COURSE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-subject">Subject</Label>
              <Input
                id="announcement-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Important update for students"
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <RichTextEditor
                content={contentHtml}
                onChange={setContentHtml}
                placeholder="Write the announcement that should be emailed to the selected students..."
              />
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              The email is sent using the organization SMTP settings when they
              are configured. If not, the backend falls back to the environment
              mail settings.
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={createAnnouncement.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {createAnnouncement.isPending ? "Sending..." : "Send Announcement"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcementsLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading announcements...
                </p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcements have been sent yet.
                </p>
              ) : (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-xl border border-border/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{announcement.subject}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {announcement.audienceType === "COURSE"
                              ? announcement.batch?.name || "Course audience"
                              : "All students"}
                          </Badge>
                          <Badge variant="outline">
                            {announcement.recipientCount} recipients
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(announcement.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div
                      className="prose prose-sm mt-3 line-clamp-3 max-w-none text-muted-foreground dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: announcement.contentHtml,
                      }}
                    />

                    <p className="mt-3 text-xs text-muted-foreground">
                      Sent by {announcement.createdBy?.username || "User"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
