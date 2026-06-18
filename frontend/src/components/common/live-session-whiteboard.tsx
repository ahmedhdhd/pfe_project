"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  Loader2,
  Pencil,
  StickyNote,
  Users,
  X,
} from "@/components/icons";
import { toast } from "sonner";
import {
  useGetClientScheduleWhiteboard,
  useGetScheduleWhiteboard,
  useUpdateClientScheduleWhiteboard,
  useUpdateScheduleWhiteboard,
} from "@/hooks";
import type {
  ScheduleWhiteboardData,
  WhiteboardPoint,
  WhiteboardStroke,
} from "@/lib/types/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type LiveSessionPortal = "admin" | "teacher" | "student";
type WhiteboardTool = "pen" | "sticky";

const BOARD_WIDTH = 1600;
const BOARD_HEIGHT = 900;
const DEFAULT_BOARD_DATA: ScheduleWhiteboardData = {
  version: 1,
  strokes: [],
  notes: [],
};

const COLOR_OPTIONS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#f59e0b"];

interface LiveSessionWhiteboardProps {
  scheduleId: string;
  portal: LiveSessionPortal;
}

const pointsToPath = (points: WhiteboardPoint[]) => {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.1} ${point.y + 0.1}`;
  }

  return points.reduce(
    (path, point, index) =>
      `${path}${index === 0 ? "M" : " L"} ${point.x} ${point.y}`,
    ""
  );
};

export function LiveSessionWhiteboard({
  scheduleId,
  portal,
}: LiveSessionWhiteboardProps) {
  const isStudentPortal = portal === "student";
  const adminWhiteboardQuery = useGetScheduleWhiteboard(
    scheduleId,
    !isStudentPortal
  );
  const studentWhiteboardQuery = useGetClientScheduleWhiteboard(
    scheduleId,
    isStudentPortal
  );
  const adminUpdateMutation = useUpdateScheduleWhiteboard();
  const studentUpdateMutation = useUpdateClientScheduleWhiteboard();

  const whiteboardQuery = isStudentPortal
    ? studentWhiteboardQuery
    : adminWhiteboardQuery;
  const updateWhiteboard = isStudentPortal
    ? studentUpdateMutation
    : adminUpdateMutation;

  const [tool, setTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [strokeWidth] = useState(4);
  const [boardData, setBoardData] =
    useState<ScheduleWhiteboardData>(DEFAULT_BOARD_DATA);
  const [isStudentEditingEnabled, setIsStudentEditingEnabled] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<WhiteboardStroke | null>(
    null
  );

  const boardRef = useRef<HTMLDivElement | null>(null);

  const whiteboard = whiteboardQuery.data;
  const canEdit = whiteboard?.permissions.canEdit ?? false;
  const canManageSettings = whiteboard?.permissions.canManageSettings ?? false;

  useEffect(() => {
    if (!whiteboard || isDirty || currentStroke) {
      return;
    }

    setBoardData(whiteboard.data || DEFAULT_BOARD_DATA);
    setIsStudentEditingEnabled(whiteboard.isStudentEditingEnabled);
  }, [currentStroke, isDirty, whiteboard]);

  const statusLabel = useMemo(() => {
    if (whiteboardQuery.isLoading) return "Loading whiteboard";
    if (updateWhiteboard.isPending) return "Saving changes";
    if (!canEdit) return "View only";
    return "Live whiteboard";
  }, [canEdit, updateWhiteboard.isPending, whiteboardQuery.isLoading]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const board = boardRef.current;
    if (!board) {
      return null;
    }

    const rect = board.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT;

    return {
      x: Math.max(0, Math.min(BOARD_WIDTH, x)),
      y: Math.max(0, Math.min(BOARD_HEIGHT, y)),
    };
  };

  const persistBoard = async (
    nextData: ScheduleWhiteboardData,
    nextStudentEditing = isStudentEditingEnabled
  ) => {
    setBoardData(nextData);
    setIsDirty(true);

    try {
      const saved = await updateWhiteboard.mutateAsync({
        id: scheduleId,
        data: {
          data: nextData,
          ...(canManageSettings
            ? { isStudentEditingEnabled: nextStudentEditing }
            : {}),
        },
      });
      setBoardData(saved.data || nextData);
      setIsStudentEditingEnabled(saved.isStudentEditingEnabled);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save whiteboard:", error);
      toast.error("Could not save whiteboard changes.");
      setIsDirty(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    if (tool === "sticky") {
      const text = window.prompt("Sticky note text");
      if (!text || !text.trim()) {
        return;
      }

      void persistBoard({
        ...boardData,
        notes: [
          ...boardData.notes,
          {
            id: crypto.randomUUID(),
            x: point.x,
            y: point.y,
            text: text.trim(),
            color: "#fef08a",
          },
        ],
      });
      return;
    }

    const stroke: WhiteboardStroke = {
      id: crypto.randomUUID(),
      color,
      width: strokeWidth,
      points: [point],
    };

    setCurrentStroke(stroke);
    setIsDirty(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!currentStroke) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    setCurrentStroke((previous) =>
      previous
        ? {
            ...previous,
            points: [...previous.points, point],
          }
        : previous
    );
  };

  const handlePointerUp = () => {
    if (!currentStroke) {
      return;
    }

    const nextData = {
      ...boardData,
      strokes: [...boardData.strokes, currentStroke],
    };

    setCurrentStroke(null);
    void persistBoard(nextData);
  };

  const handleClearBoard = () => {
    if (!canEdit) {
      return;
    }

    void persistBoard({
      ...boardData,
      strokes: [],
      notes: [],
    });
  };

  const handleToggleStudentEditing = async (checked: boolean) => {
    if (!canManageSettings) {
      return;
    }

    setIsStudentEditingEnabled(checked);

    try {
      const saved = await updateWhiteboard.mutateAsync({
        id: scheduleId,
        data: {
          isStudentEditingEnabled: checked,
        },
      });
      setIsStudentEditingEnabled(saved.isStudentEditingEnabled);
    } catch (error) {
      console.error("Failed to update whiteboard settings:", error);
      toast.error("Could not update student editing.");
      setIsStudentEditingEnabled(!checked);
    }
  };

  const updateNoteText = (noteId: string) => {
    if (!canEdit) {
      return;
    }

    const existing = boardData.notes.find((note) => note.id === noteId);
    if (!existing) {
      return;
    }

    const text = window.prompt("Edit sticky note", existing.text);
    if (text === null) {
      return;
    }

    const nextData = {
      ...boardData,
      notes: boardData.notes.map((note) =>
        note.id === noteId ? { ...note, text: text.trim() } : note
      ),
    };
    void persistBoard(nextData);
  };

  const deleteNote = (noteId: string) => {
    if (!canEdit) {
      return;
    }

    const nextData = {
      ...boardData,
      notes: boardData.notes.filter((note) => note.id !== noteId),
    };
    void persistBoard(nextData);
  };

  if (whiteboardQuery.isLoading && !whiteboard) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed bg-muted/10">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading whiteboard...
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base font-medium">
              Live Class Whiteboard
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{statusLabel}</Badge>
              {isStudentEditingEnabled ? (
                <Badge variant="outline">Students can edit</Badge>
              ) : (
                <Badge variant="outline">Students view only</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageSettings ? (
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Student editing</span>
                <Switch
                  checked={isStudentEditingEnabled}
                  onCheckedChange={handleToggleStudentEditing}
                />
              </label>
            ) : null}
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant={tool === "pen" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("pen")}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Pen
                </Button>
                <Button
                  type="button"
                  variant={tool === "sticky" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("sticky")}
                >
                  <StickyNote className="mr-2 h-4 w-4" />
                  Sticky
                </Button>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Choose ${option} color`}
                      onClick={() => setColor(option)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition",
                        color === option
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: option }}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearBoard}
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="bg-[#f8fafc] p-4">
        <div
          ref={boardRef}
          className={cn(
            "relative mx-auto min-h-[520px] w-full overflow-hidden rounded-2xl border bg-white shadow-inner",
            canEdit && tool === "pen" ? "cursor-crosshair" : "cursor-default"
          )}
          style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            className="absolute inset-0 h-full w-full"
          >
            {boardData.strokes.map((stroke) => (
              <path
                key={stroke.id}
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={stroke.width}
              />
            ))}
            {currentStroke ? (
              <path
                d={pointsToPath(currentStroke.points)}
                fill="none"
                stroke={currentStroke.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={currentStroke.width}
              />
            ) : null}
          </svg>

          {boardData.notes.map((note) => (
            <div
              key={note.id}
              className="absolute w-40 rounded-xl border border-amber-200 bg-amber-100/95 p-3 text-sm shadow-md"
              style={{
                left: `${(note.x / BOARD_WIDTH) * 100}%`,
                top: `${(note.y / BOARD_HEIGHT) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => updateNoteText(note.id)}
                  className="line-clamp-6 flex-1 text-left text-slate-800"
                >
                  {note.text || "Empty note"}
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="rounded-full p-1 text-slate-500 transition hover:bg-amber-200 hover:text-slate-900"
                    aria-label="Delete note"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
