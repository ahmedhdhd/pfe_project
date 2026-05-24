/**
 * Schedule types and interfaces
 * 
 * Centralized type definitions for schedule-related functionality
 */

export type ScheduleStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
export type ScheduleAudienceType = "ORGANIZATION" | "COURSE";

export interface Schedule {
  id: string;
  audienceType: ScheduleAudienceType;
  topicId?: string;
  batchId?: string;
  subjectId?: string;
  chapterId?: string;
  title: string;
  description?: string;
  subjectName?: string;
  chapterName?: string;
  roomName: string;
  scheduledAt: string;
  duration: number;
  teacherId?: string;
  thumbnailUrl?: string;
  notifyBeforeMinutes?: number;
  tags?: string[];
  status?: ScheduleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateScheduleData {
  audienceType: ScheduleAudienceType;
  topicId?: string;
  batchId?: string;
  subjectId?: string;
  chapterId?: string;
  title: string;
  description?: string;
  subjectName?: string;
  chapterName?: string;
  scheduledAt: string;
  duration: number;
  teacherId?: string;
  thumbnailUrl?: string;
  notifyBeforeMinutes?: number;
  tags?: string[];
}

export interface UpdateScheduleData {
  audienceType?: ScheduleAudienceType;
  batchId?: string;
  subjectId?: string;
  topicId?: string;
  title?: string;
  description?: string;
  subjectName?: string;
  scheduledAt?: string;
  duration?: number;
  teacherId?: string;
  thumbnailUrl?: string;
  notifyBeforeMinutes?: number;
  tags?: string[];
}

export interface UpdateScheduleStatusData {
  status: ScheduleStatus;
}

export interface ScheduleFilters {
  page?: number;
  limit?: number;
  status?: ScheduleStatus;
  batchId?: string;
  teacherId?: string;
  date?: string; // YYYY-MM-DD
  upcoming?: boolean;
}

export interface ScheduleListResponse {
  data: Schedule[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ScheduleJoinSession {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  participantName: string;
  canPublish: boolean;
  schedule: Schedule;
}

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  color: string;
  width: number;
  points: WhiteboardPoint[];
}

export interface WhiteboardNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface ScheduleWhiteboardData {
  version: number;
  strokes: WhiteboardStroke[];
  notes: WhiteboardNote[];
}

export interface ScheduleWhiteboard {
  id?: string;
  scheduleId: string;
  data: ScheduleWhiteboardData;
  isStudentEditingEnabled: boolean;
  permissions: {
    canEdit: boolean;
    canManageSettings: boolean;
  };
  updatedAt?: string | null;
}

export interface ScheduleAttendance {
  id: string;
  scheduleId: string;
  userId: string;
  joinedAt: string;
  lastJoinedAt?: string | null;
  leftAt?: string | null;
  durationMins: number;
  isPresent: boolean;
  user: {
    id: string;
    username: string;
    email?: string | null;
  };
}

export interface ScheduleAttendanceSummary {
  participants: number;
  presentNow: number;
  totalAttendanceMins: number;
  averageAttendanceMins: number;
  streamingDurationMins: number;
  streamStartedAt?: string | null;
  streamEndedAt?: string | null;
}

export interface ScheduleAiSummary {
  scheduleId: string;
  title: string;
  status: ScheduleStatus;
  aiSummary?: string | null;
  summaryGeneratedAt?: string | null;
}
