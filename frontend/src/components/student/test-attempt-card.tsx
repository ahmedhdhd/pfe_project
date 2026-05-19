"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date";

interface TestAttemptCardProps {
  id: string;
  title: string;
  testSeriesName: string;
  totalMarks: number;
  obtainedMarks: number;
  totalQuestions: number;
  attemptedQuestions: number;
  accuracy: number;
  attemptedAt: Date;
  rank: number;
  percentile: number;
  index?: number;
}

export function TestAttemptCard({
  id,
  title,
  testSeriesName,
  totalMarks,
  obtainedMarks,
  totalQuestions,
  attemptedQuestions,
  accuracy,
  attemptedAt,
  rank,
  percentile,
  index = 0,
}: TestAttemptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 h-full p-0">
        <CardHeader className="pb-3 px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
              <CardDescription className="text-xs">
                {testSeriesName}
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground shrink-0 ml-2"
            >
              <Award className="h-3 w-3 mr-1" />
              {percentile}%ile
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-4 px-4 sm:px-6">
          {/* Score Section */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <p className="text-2xl font-bold text-primary">
                {obtainedMarks}
                <span className="text-sm text-muted-foreground">
                  /{totalMarks}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Rank</p>
              <p className="text-2xl font-bold">#{rank}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Questions</p>
              <p className="font-semibold">
                {attemptedQuestions}/{totalQuestions}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
              <p className="font-semibold text-green-600">{accuracy}%</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {formatDate(attemptedAt)}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/student/tests/${id}/review`}>View Analysis</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
