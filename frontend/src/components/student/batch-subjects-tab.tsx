"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetClientSubjectsByBatch,
  useGetClientChaptersBySubject,
} from "@/hooks";
import { useParams } from "next/navigation";
import { ChevronRight, PlayCircle } from "lucide-react";
import Link from "next/link";

interface Subject {
  id: string;
  name: string;
  thumbnailUrl?: string;
  description?: string;
}

// Component to fetch and display chapter count for a subject
function SubjectChapterCount({ subjectId }: { subjectId: string }) {
  const { data: chaptersResponse, isLoading } =
    useGetClientChaptersBySubject(subjectId);
  const chapterCount = chaptersResponse?.data?.length || 0;

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Loading...</span>;
  }

  return (
    <span className="text-sm text-muted-foreground">
      {chapterCount} {chapterCount === 1 ? "Chapter" : "Chapters"}
    </span>
  );
}

export function BatchSubjectsTab() {
  const params = useParams();
  const batchId = params.id as string;

  const { data: subjectsResponse, isLoading } =
    useGetClientSubjectsByBatch(batchId);
  const subjects: Subject[] = subjectsResponse?.data || [];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      >
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="bg-card/95 rounded-xl border border-border/60 shadow-md"
          >
            <CardContent className="p-0 px-6 py-4">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
                <div className="w-5 h-5 bg-muted rounded shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    );
  }

  if (subjects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">
              No Subjects Available
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Subjects will be available here once they are added to this batch.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight mb-1">Subjects</h2>
        <p className="text-muted-foreground text-sm">
          Explore all subjects and their chapters
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      >
        {subjects.map((subject, index) => {
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link
                href={`/student/batches/${batchId}/subjects/${subject.id}`}
                className="block h-full"
              >
                <Card className="group bg-card/95 text-card-foreground rounded-xl border border-border/60 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <CardContent className="p-0 px-6 py-4 flex items-center gap-4">
                    {/* Left: Circular Image */}
                    <div className="shrink-0">
                      {subject.thumbnailUrl ? (
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-foreground/20 shrink-0">
                          <img
                            src={subject.thumbnailUrl}
                            alt={subject.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted border-2 border-foreground/20 flex items-center justify-center shrink-0">
                          <PlayCircle className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Center: Title and Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        <SubjectChapterCount subjectId={subject.id} />
                      </div>
                    </div>

                    {/* Right: Chevron Icon */}
                    <div className="shrink-0">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
