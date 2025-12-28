
export enum UserRole {
  ADMIN = 'ADMIN',
  REGULAR = 'REGULAR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  assignedProjectIds: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  dailyLimit: number;
  currentGenerations: number;
  createdAt: string;
  status: 'active' | 'paused' | 'exhausted';
  ownerId: string;
  cloudinaryCloudName?: string;
  cloudinaryTag?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
}

export interface UsageLog {
  id: string;
  projectId: string;
  timestamp: string;
  amount: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface CloudinaryImage {
  public_id: string;
  version: number;
  format: string;
  width: number;
  height: number;
  type: string;
  created_at: string;
}
