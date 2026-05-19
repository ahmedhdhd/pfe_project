"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLeaderboard } from "@/hooks/test-attempts-client";
import { Loader2, Trophy, Medal, Award, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function TestLeaderboardPage() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId;
  const [page, setPage] = useState(1);
  const limit = 20;

  // Hooks must be called unconditionally - use enabled option to conditionally fetch
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useLeaderboard(testId, page, limit);

  // Validate testId after hooks are called
  if (!testId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Leaderboard"
            description="View rankings and your performance"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Invalid test ID. Please select a test to view leaderboard.
              </p>
              <Button asChild>
                <Link href="/student/my-learning">Go to My Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const leaderboard = leaderboardData?.data?.leaderboard || [];
  const userRank = leaderboardData?.data?.userRank;

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Leaderboard"
            description="View rankings and your performance"
          />
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !leaderboardData) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Leaderboard"
            description="View rankings and your performance"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Failed to load leaderboard. Please try again.
              </p>
              <Button asChild>
                <Link href="/student/my-learning">Go to My Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-semibold">#{rank}</span>;
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        <PageHeader
          title="Test Leaderboard"
          description="View rankings and your performance"
        />

        {/* User Rank Card */}
        {userRank && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    Rank #{userRank.rank}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Percentile: {userRank.percentile.toFixed(1)}%
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Top {userRank.percentile.toFixed(0)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No rankings available yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{entry.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Score: {entry.score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {entry.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {leaderboard.length === limit && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" asChild className="w-full">
          <Link href="/student/my-learning">Back to My Learning</Link>
        </Button>
      </div>
    </div>
  );
}
