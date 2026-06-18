"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Calendar, ChevronRight } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDateRange } from "@/lib/utils/date";

interface BatchCardProps {
  id: string;
  name: string;
  class: string;
  exam: string;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  language: string;
  totalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  progress: number;
  totalSubjects: number;
  completedSubjects: number;
  index?: number;
}

export function BatchCard({
  id,
  name,
  class: className,
  exam,
  imageUrl,
  startDate,
  endDate,
  language,
  progress,
  totalSubjects,
  completedSubjects,
  index = 0,
}: BatchCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="group flex h-full flex-col overflow-hidden border-2 p-0 transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
        <div className="relative h-48 flex-shrink-0 overflow-hidden bg-linear-to-br from-primary/20 to-primary/5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-20 w-20 text-primary/40" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="border-0 bg-black/60 text-white">{exam}</Badge>
            <Badge
              variant="secondary"
              className="border-0 bg-black/60 text-white"
            >
              Class {className}
            </Badge>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col space-y-4 p-5">
          <div>
            <h3 className="line-clamp-2 text-lg font-bold transition-colors group-hover:text-primary">
              {name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {language} | {totalSubjects} Lessons
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-accent">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 [&>div]:bg-accent" />
            <p className="text-xs text-muted-foreground">
              {completedSubjects} of {totalSubjects} lessons completed
            </p>
          </div>

          <div className="flex items-center gap-2 border-t pt-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateRange(startDate, endDate)}</span>
          </div>

          <Button className="mt-auto w-full" asChild>
            <Link href={`/student/batches/${id}`}>
              Continue Learning
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
