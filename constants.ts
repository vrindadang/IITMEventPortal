
import { Category, Task, User, Phase } from './types.ts';

export const EVENT_DATE = "2026-03-10";

export const USERS: User[] = [
  { id: '1', name: 'Dr. Anup Naha', email: 'anup@example.com', role: 'team-member', department: 'Student Outreach', password: 'password123' },
  { id: '2', name: 'Ms. Rachneet', email: 'rachneet@example.com', role: 'team-member', department: 'Promotion', password: 'password123' },
  { id: '3', name: 'Mr. Anmol', email: 'anmol@example.com', role: 'team-member', department: 'Logistics', password: 'password123' },
  { id: '4', name: 'Ms. Shalini', email: 'shalini@example.com', role: 'admin', department: 'Admin', password: 'password123' },
  { id: '5', name: 'Dr. Usha Rani', email: 'usha@example.com', role: 'team-member', department: 'Education', password: 'password123' },
  { id: '6', name: 'Puja Munjal', email: 'puja@iitm.ac.in', role: 'admin', department: 'Strategy', password: 'password123' },
  { id: '7', name: 'Lalit Kumar', email: 'lalit@iitm.ac.in', role: 'team-member', department: 'Operations', password: 'password123' },
  { id: '8', name: 'Ashwani Sachdeva (President)', email: 'ashwani@iitm.ac.in', role: 'admin', department: 'President Office', password: 'password123' },
  { id: '9', name: 'Super Admin', email: 'admin@iitm.ac.in', role: 'super-admin', department: 'Executive', password: 'admin123' }
];

export const CATEGORIES: Category[] = [
  { id: 'cat-001', name: 'Student Club Participation', phase: 'pre-event', responsiblePersons: ['Dr. Anup Naha', 'Ms. Rachneet', 'Ashwani Sachdeva (President)'], progress: 0, status: 'not-started', dueDate: '2026-03-05', priority: 'high' },
  { id: 'cat-002', name: 'Email & Invitations', phase: 'pre-event', responsiblePersons: ['Mr. Anmol', 'IIT Team', 'Puja Munjal'], progress: 0, status: 'not-started', dueDate: '2026-03-01', priority: 'high' },
  { id: 'cat-003', name: 'Social Media Promotion', phase: 'pre-event', responsiblePersons: ['YA Rep', 'IIT Team', 'Lalit Kumar'], progress: 0, status: 'not-started', dueDate: '2026-03-09', priority: 'medium' },
  { id: 'cat-004', name: 'Campus Publicity', phase: 'pre-event', responsiblePersons: ['Ms. Shalini', 'IIT Team'], progress: 0, status: 'not-started', dueDate: '2026-03-01', priority: 'high' },
  { id: 'cat-005', name: 'Live Social Media Updates', phase: 'during-event', responsiblePersons: ['YA Rep', 'Lalit Kumar'], progress: 0, status: 'not-started', dueDate: '2026-03-10', priority: 'medium' },
  { id: 'cat-006', name: 'Event Documentation', phase: 'during-event', responsiblePersons: ['Ms. Sanchi', 'Puja Munjal'], progress: 0, status: 'not-started', dueDate: '2026-03-10', priority: 'high' },
  { id: 'cat-007', name: 'Event Highlights Sharing', phase: 'post-event', responsiblePersons: ['Digital Team', 'Ashwani Sachdeva (President)'], progress: 0, status: 'not-started', dueDate: '2026-03-15', priority: 'medium' },
];

export const TASKS: Task[] = [];
