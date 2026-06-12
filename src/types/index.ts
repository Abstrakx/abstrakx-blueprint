export type UserRole = 'owner' | 'developer' | 'viewer';
export type AuthProvider = 'github' | 'google';

export interface Project {
  id: string;
  name: string;
  github_repo: string;
  docs_dir: string;
  branch: string;
  status: 'active' | 'idle';
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  role: UserRole;
  avatar_color: string;
  title?: string;
}

export interface Task {
  id: string;
  project_id: string;
  text: string;
  assignee: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: DocFile[];
}

export interface CompiledNote {
  id: string;
  title: string;
  file_path: string;
  line_number: number;
  author?: string;
}
