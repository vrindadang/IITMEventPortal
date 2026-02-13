
export type Phase = 'pre-event' | 'during-event' | 'post-event';

export type Status = 'not-started' | 'in-progress' | 'completed' | 'blocked';

export type NavView = 'dashboard' | 'tasks' | 'progress' | 'my-tasks-sub' | 'overall-tasks-list' | 'gallery' | 'approvals' | 'messenger' | 'schedule' | 'team-members' | 'confirmed-guest-list';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team-member' | 'super-admin';
  department: string;
  password?: string;
}

export interface TaskUpdate {
  timestamp: string;
  user: string;
  message: string;
  progressBefore: number;
  progressAfter: number;
}

export interface Task {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  assignedTo: string[]; // User IDs or Names
  status: Status;
  progress: number;
  dueDate: string;
  updates: TaskUpdate[];
  scheduleItemId?: string;
  attachments?: string[];
}

export interface Category {
  id: string;
  name: string;
  phase: Phase;
  responsiblePersons: string[];
  progress: number;
  status: Status;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ScheduleItem {
  id: string;
  s_no: number;
  time: string;
  event_transit: string;
  duration: string;
  description?: string;
}

export interface GalleryItem {
  id: string;
  task_id: string;
  schedule_item_id: string;
  uploaded_by: string;
  photo_data: string;
  created_at: string;
}

export interface Attendee {
  id: string;
  name: string;
  designation: string;
  organization: string;
  invited_by: string;
  created_at: string;
}

export interface EventState {
  id: string;
  title: string;
  date: string;
  status: 'planning' | 'ongoing' | 'completed';
  overallProgress: number;
  phases: {
    [key in Phase]: {
      progress: number;
      weight: number;
    };
  };
}
