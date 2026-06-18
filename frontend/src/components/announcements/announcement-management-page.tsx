"use client";

import { useMemo, useState } from "react";
import { Megaphone, Send, Clock3, Users, Eye } from "@/components/icons";
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
import { Separator } from "@/components/ui/separator";

import {
  useCreateAnnouncement,
  useGetAllBatches,
  useGetAnnouncements,
} from "@/hooks";

type Audience = "ORGANIZATION" | "COURSE";

interface Props {
  basePath: "admin" | "teacher";
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").trim();

export function AnnouncementManagementPage({ basePath }: Props) {
  const [form, setForm] = useState({
    subject: "",
    content: "",
    audience: "ORGANIZATION" as Audience,
    batchId: "",
  });

  const { subject, content, audience, batchId } = form;

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createAnnouncement = useCreateAnnouncement();
  const { data: batchesResponse } = useGetAllBatches();
  const { data: announcementsResponse, isLoading } = useGetAnnouncements();

  const batches = useMemo(
    () => (batchesResponse?.data ?? []) as { id: string; name: string }[],
    [batchesResponse]
  );

  const announcements = useMemo(
    () => (announcementsResponse?.data ?? []) as any[],
    [announcementsResponse]
  );

  const wordCount = useMemo(() => {
    const text = stripHtml(content);
    return text ? text.split(/\s+/).length : 0;
  }, [content]);

  const reset = () => {
    setForm({
      subject: "",
      content: "",
      audience: "ORGANIZATION",
      batchId: "",
    });
  };

  const submit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Missing required fields");
      return;
    }

    if (audience === "COURSE" && !batchId) {
      toast.error("Select a course first");
      return;
    }

    try {
      await createAnnouncement.mutateAsync({
        subject: subject.trim(),
        contentHtml: content,
        audienceType: audience,
        batchId: audience === "COURSE" ? batchId : undefined,
      });

      reset();
      toast.success("Announcement sent");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Something went wrong");
    }
  };

  const canSubmit =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    !(audience === "COURSE" && !batchId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Announcements"
        description="Send updates to students"
        breadcrumbs={[
          {
            label: basePath,
            href: `/${basePath}/dashboard`,
          },
          { label: "Announcements" },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* FORM */}
        <div className="xl:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Megaphone className="h-6 w-6" />
                New announcement
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Audience */}
              <div className="space-y-2">
                <Label>Audience</Label>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Select
                    value={audience}
                    onValueChange={(v: Audience) => {
                      setField("audience", v);
                      if (v !== "COURSE") setField("batchId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORGANIZATION">
                        All students
                      </SelectItem>
                      <SelectItem value="COURSE">
                        Specific course
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={batchId}
                    onValueChange={(v) => setField("batchId", v)}
                    disabled={audience !== "COURSE"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Subject */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Subject</Label>
                  <span>{subject.length}/120</span>
                </div>

                <Input
                  value={subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Message</Label>
                  <span>{wordCount} words</span>
                </div>

                <RichTextEditor
                  content={content}
                  onChange={(v) => setField("content", v)}
                />
              </div>

              {/* Hint */}
              <div className="text-sm text-muted-foreground flex gap-2">
                <Eye className="h-4 w-4 mt-0.5" />
                Sent as email to selected audience
              </div>

              <div className="flex justify-end">
                <Button onClick={submit} disabled={!canSubmit || createAnnouncement.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="xl:col-span-5">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5" />
                Recent
              </CardTitle>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcements yet
                </p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((a) => (
                    <div key={a.id} className="border rounded-xl p-4">
                      <p className="font-medium line-clamp-2">
                        {a.subject}
                      </p>

                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">
                          {a.audienceType}
                        </Badge>
                        <Badge variant="outline">
                          {a.recipientCount}
                        </Badge>
                      </div>

                      <div
                        className="text-sm mt-3 line-clamp-3 text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: a.contentHtml }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}