
export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export type AppMode = 'TASK_MANAGER' | 'REMOTE_WORK';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export enum TaskPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum AssigneeType {
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
}

export interface RemoteWorkSettings {
  isEnabled: boolean; // Remote work allowed/enabled
  
  // Activity Monitoring
  checkInactivity: boolean; // Check Mouse/Keyboard
  inactivityThreshold: number; // Minutes allowed before alert
  
  // Legacy/Optional
  requireWebcam?: boolean; 
  requireScreenRecord?: boolean; 
}

export interface RemoteLog {
  id: string;
  userId: string;
  taskId: string;
  timestamp: string; // ISO String
  type: 'ACTIVITY_ALERT' | 'ACTIVITY_RESUMED'; // Updated types
  activityLevel?: 'ACTIVE' | 'IDLE';
  description?: string;
}

// New Interface for Independent Remote Attendance
export interface RemoteAttendance {
    id: string;
    userId: string;
    startTime: string; // ISO String
    endTime?: string; // ISO String
    breaks: { startTime: string; endTime?: string }[];
    status: 'WORKING' | 'BREAK' | 'COMPLETED';
    totalDuration?: number; // Calculated duration in ms
    terminationReason?: 'MANUAL' | 'AUTO_CLOSE'; // New field: How the session ended
}

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  role: Role;
  department: string;
  avatar: string;
  remoteSettings?: RemoteWorkSettings; // Optional override for specific employee
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  assigneeIds: string[]; 
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string; // ISO String
}

export interface TimeLog {
  id: string;
  userId: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String
  isBreakStart?: boolean; // New field to track if log ended due to a break
  description?: string; // New field for end-of-work comments
  subTaskId?: string; // New: Track which subtask was worked on
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority; // New field
  startDate?: string; // New field: Start Date
  dueDate: string; // ISO String
  createdAt: string; // ISO String
  assigneeType: AssigneeType;
  assigneeId: string; // Employee ID or Department Name
  subTasks: SubTask[];
  comments: Comment[]; // New field for discussions
  createdBy: string; // Manager ID
  timeLogs: TimeLog[]; // New field for tracking time
  isOnBreak?: boolean; // New field to track if the task is currently paused for a break
  viewedByAssignee?: boolean; // New field to track if the assignee has seen the new task notification
  unseenCommentsFor?: string[]; // New: List of user IDs who haven't seen the latest comments
  isDeleted?: boolean; // Soft delete flag
  archivedBy?: string[]; // New: List of User IDs who archived this task (Personal Archive)
}

export interface PersonalTask {
  id: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  description?: string; // New: Optional description
  dueDate?: string; // New: Optional ISO Date String
  time?: string; // New: Optional Time (HH:mm)
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO String (Date part)
  time: string; // HH:mm (Start Time)
  endTime?: string; // HH:mm (End Time)
  attendeeIds: string[];
  createdBy: string;
}

export interface DashboardStats {
  active: number;
  completed: number;
  overdue: number;
  nearDeadline: number;
}

// Ding API Specific Interfaces
export interface DingAttendanceRecord {
  first_name: string;
  last_name: string;
  gender: string;
  profile_image: string;
  cell_number: string;
  type: string; // 'in' or 'out'
  action_type: string; // 'normal', 'leave', 'mission'
  date_time: string;
}

// Correspondence (Kartabl) Interfaces
export enum CorrespondenceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Correspondence {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  createdAt: string; // ISO String
  status: CorrespondenceStatus;
  attachment?: string; // Base64 String
  attachmentName?: string;
  managerResponse?: string; // Admin's comment
  viewedByAdmin: boolean; // Has admin seen this?
  viewedByUser: boolean; // Has user seen the response?
}

// --- Experimental Idle Detection API Types ---
export type UserIdleState = 'active' | 'idle';
export type ScreenIdleState = 'locked' | 'unlocked';

export interface IdleDetector extends EventTarget {
  userState: UserIdleState | null;
  screenState: ScreenIdleState | null;
  start(options?: { threshold: number; signal?: AbortSignal }): Promise<void>;
  requestPermission(): Promise<'granted' | 'denied'>;
}

// Augment the global window interface
declare global {
  interface Window {
    IdleDetector: {
      new (): IdleDetector;
      requestPermission(): Promise<'granted' | 'denied'>;
    };
  }
}
