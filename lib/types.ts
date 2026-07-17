export type Client = {
  id: number;
  created_at: string;
  client_name: string;
  user_id: string | null;
};

export type Project = {
  id: number;
  created_at: string;
  project_name: string;
  projct_description: string | null;
  client_id: number;
};

export type Operation = {
  id: number;
  project_id: number;
  created_at: string;
  operation_name: string | null;
  operation_description: string | null;
};

export type TimeLog = {
  id: number;
  created_at: string;
  operation_id: number | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  pause_ms: number;
};

export type OperationWithLogs = Operation & {
  time_log: TimeLog[];
};

export type ProjectWithOperations = Project & {
  operations: OperationWithLogs[];
};

export type ClientWithProjects = Client & {
  projects: ProjectWithOperations[];
};
