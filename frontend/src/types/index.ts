// Bitrix24 Types
export interface BitrixTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  responsibleId: string;
  createdDate?: string;
  deadline?: string;
  startDatePlan?: string;
  endDatePlan?: string;
  closedDate?: string;
  groupId?: string;
}

export interface BitrixUser {
  ID: string;
  NAME: string;
  LAST_NAME: string;
  SECOND_NAME?: string;
  WORK_POSITION?: string;
  UF_DEPARTMENT?: string[];
  ACTIVE: boolean;
}

export interface BitrixDepartment {
  ID: string;
  NAME: string;
  PARENT?: string;
  SORT: number;
}

// Gantt Types
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'project' | 'milestone';
  dependencies?: string[];
  styles?: {
    backgroundColor?: string;
    backgroundSelectedColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
  isDisabled?: boolean;
  project?: string;
  hideChildren?: boolean;
}

export interface Department {
  id: string;
  name: string;
  parent?: string;
  users: User[];
  sort: number;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  position?: string;
  departmentIds: string[];
  active: boolean;
}

export interface GanttRow {
  type: 'department' | 'user';
  id: string;
  name: string;
  tasks: GanttTask[];
  children?: GanttRow[];
  collapsed?: boolean;
  level: number;
  parentId?: string;
}

// Filter Types
export interface FilterState {
  dateRange: [Date, Date] | null;
  selectedDepartments: string[];
  selectedUsers: string[];
  searchQuery: string;
  statusFilter: string[];
}

// Store Types
export interface AppState {
  sessionId: string | null;
  accessToken: string | null;
  domain: string | null;
  isAuthenticated: boolean;
  setAuth: (sessionId: string, accessToken: string, domain: string) => void;
  clearAuth: () => void;
}

export interface DataState {
  tasks: BitrixTask[];
  users: User[];
  departments: Department[];
  loading: boolean;
  error: string | null;
}


