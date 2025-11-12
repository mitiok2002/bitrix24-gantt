import type {
  GanttTask,
  Department,
  User,
  GanttRow,
  BitrixProject
} from '../types';
import dayjs from 'dayjs';

// Трансформация пользователей Bitrix24
export const transformBitrixUsers = (bitrixUsers: any[]): User[] => {
  return bitrixUsers.map(user => ({
    id: String(user.ID),
    name: user.NAME || '',
    lastName: user.LAST_NAME || '',
    position: user.WORK_POSITION || '',
    departmentIds: Array.isArray(user.UF_DEPARTMENT)
      ? user.UF_DEPARTMENT.map((deptId: any) => String(deptId))
      : [],
    active: user.ACTIVE === true
  }));
};

// Трансформация подразделений Bitrix24
export const transformBitrixDepartments = (bitrixDepts: any[]): Department[] => {
  return bitrixDepts.map(dept => ({
    id: String(dept.ID),
    name: dept.NAME,
    parent: dept.PARENT ? String(dept.PARENT) : undefined,
    users: [],
    sort: dept.SORT || 0
  }));
};

// Трансформация задач Bitrix24 в формат Gantt
const pickField = (task: any, keys: string[]) => {
  for (const key of keys) {
    const value = task[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

export const transformBitrixProjects = (bitrixProjects: any[]): BitrixProject[] => {
  return bitrixProjects.map(project => {
    const id = String(project.ID ?? project.id);
    return {
      id,
      name: project.NAME ?? project.name ?? 'Без названия',
      dateCreate: project.DATE_CREATE ?? project.dateCreate,
      visible: project.VISIBLE ?? project.visible ?? false,
      opened: project.OPENED ?? project.opened ?? false,
      avatar: project.AVATAR ?? project.avatar ?? undefined,
      image: project.IMAGE ?? project.image ?? undefined,
      ownerId:
        project.OWNER_ID !== undefined
          ? String(project.OWNER_ID)
          : project.ownerId !== undefined
          ? String(project.ownerId)
          : undefined
    };
  });
};

export const transformBitrixTasks = (
  bitrixTasks: any[],
  bitrixProjects: any[] = []
): GanttTask[] => {
  const projectMap = new Map<string, BitrixProject>();
  transformBitrixProjects(bitrixProjects).forEach(project => {
    projectMap.set(project.id, project);
  });

  const transformedTasks = bitrixTasks
    .filter(task => {
      const hasStartDate =
        pickField(task, ['START_DATE_PLAN', 'startDatePlan']) ||
        pickField(task, ['CREATED_DATE', 'createdDate']);
      const hasEndDate =
        pickField(task, ['END_DATE_PLAN', 'endDatePlan']) ||
        pickField(task, ['DEADLINE', 'deadline']) ||
        pickField(task, ['CLOSED_DATE', 'closedDate']);
      return hasStartDate && hasEndDate;
    })
    .map(task => {
      const title =
        pickField(task, ['TITLE', 'title']) ||
        pickField(task, ['NAME', 'name']) ||
        'Без названия';

      const startDate =
        pickField(task, ['START_DATE_PLAN', 'startDatePlan']) ||
        pickField(task, ['CREATED_DATE', 'createdDate']);
      const endDate =
        pickField(task, ['END_DATE_PLAN', 'endDatePlan']) ||
        pickField(task, ['DEADLINE', 'deadline']) ||
        pickField(task, ['CLOSED_DATE', 'closedDate']);
      
      const start = dayjs(startDate).toDate();
      let end = dayjs(endDate).toDate();
      
      // Если дата окончания раньше даты начала, устанавливаем конец через день после начала
      if (end < start) {
        end = dayjs(start).add(1, 'day').toDate();
      }

      // Определяем прогресс на основе статуса
      let progress = 0;
      const status = pickField(task, ['STATUS', 'status']);
      const responsibleId =
        pickField(task, ['RESPONSIBLE_ID', 'responsibleId']) ?? '';
      if (status === '5') progress = 100; // Завершена
      else if (status === '4') progress = 75; // Ждет контроля
      else if (status === '3') progress = 50; // В работе
      else if (status === '2') progress = 0; // Новая

      // Цвет в зависимости от статуса
      let backgroundColor = '#4caf50'; // Зеленый по умолчанию
      if (status === '5') backgroundColor = '#2196f3'; // Синий - завершена
      else if (status === '7') backgroundColor = '#f44336'; // Красный - отложена
      else if (status === '3') backgroundColor = '#ff9800'; // Оранжевый - в работе

      const id =
        pickField(task, ['ID', 'id']) ??
        `${String(title)}_${pickField(task, ['RESPONSIBLE_ID', 'responsibleId']) ?? 'unknown'}`;

      const parentId = pickField(task, ['PARENT_ID', 'parentId']);
      const groupId = pickField(task, ['GROUP_ID', 'groupId']);
      const projectId =
        groupId !== undefined && groupId !== null
          ? String(groupId)
          : undefined;
      const projectMeta = projectId ? projectMap.get(projectId) : undefined;

      const depsRaw =
        task.SE_DEPENDS_ON ??
        task.seDependsOn ??
        task.DEPENDS_ON ??
        [];
      const dependencies = Array.isArray(depsRaw)
        ? depsRaw
            .map((dep: any) => dep.DEPENDS_ON_ID ?? dep.dependsOnId ?? dep.TASK_ID ?? dep.taskId)
            .filter((depId: any) => depId !== undefined && depId !== null)
            .map((depId: any) => String(depId))
        : [];

      const deadlineValue = pickField(task, ['DEADLINE', 'deadline']);
      const isOverdue =
        deadlineValue && status !== '5'
          ? dayjs(deadlineValue).isBefore(dayjs(), 'day')
          : false;

      const assigneeId = responsibleId ? String(responsibleId) : undefined;

      return {
        id: String(id),
        name: String(title),
        start,
        end,
        progress,
        type: 'task' as const,
        status: status ? String(status) : undefined,
        responsibleId: assigneeId,
        assigneeId,
        raw: task,
        styles: {
          backgroundColor,
          backgroundSelectedColor: backgroundColor,
          progressColor: '#fff',
          progressSelectedColor: '#fff'
        },
        project: assigneeId, // Текущая группировка по ответственному
        parentId: parentId !== undefined ? String(parentId) : null,
        projectId: projectId ?? null,
        projectName: projectMeta?.name,
        projectMeta,
        dependencies,
        isOverdue
      };
    });

  return markCriticalPath(transformedTasks);
};

// Построение проектного дерева
export const buildGanttRows = (
  tasks: GanttTask[],
  projects: BitrixProject[],
  users: User[],
  collapsedIds: Set<string> = new Set()
): GanttRow[] => {
  const rows: GanttRow[] = [];
  if (tasks.length === 0) {
    return rows;
  }

  const userMap = new Map<string, User>();
  users.forEach(user => userMap.set(user.id, user));

  const taskMap = new Map<string, GanttTask>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const childrenByParent = new Map<string | null, GanttTask[]>();
  tasks.forEach(task => {
    const parentKey = task.parentId ?? null;
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey)!.push(task);
  });

  const projectMap = new Map<string, BitrixProject>();
  projects.forEach(project => projectMap.set(project.id, project));

  const buckets = new Map<string, GanttTask[]>();
  tasks.forEach(task => {
    const key =
      task.projectId && projectMap.has(task.projectId)
        ? task.projectId
        : 'unassigned';
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(task);
  });

  const gatherDescendants = (taskId: string): GanttTask[] => {
    const direct = childrenByParent.get(taskId) ?? [];
    const result: GanttTask[] = [];
    direct.forEach(child => {
      result.push(child);
      result.push(...gatherDescendants(child.id));
    });
    return result;
  };

  buckets.forEach((projectTasks, projectId) => {
    if (projectTasks.length === 0) {
      return;
    }

    const projectMeta =
      projectId !== 'unassigned' ? projectMap.get(projectId) : undefined;
    const projectRowId =
      projectId === 'unassigned' ? 'project_unassigned' : `project_${projectId}`;

    const projectRow: GanttRow = {
      type: 'project',
      id: projectRowId,
      name: projectMeta?.name ?? 'Без проекта',
      tasks: [],
      children: [],
      collapsed: collapsedIds.has(projectRowId),
      level: 0
    };

    const roots = projectTasks.filter(task => {
      if (!task.parentId) return true;
      const parent = taskMap.get(task.parentId);
      if (!parent) return true;
      return (parent.projectId ?? null) !== (task.projectId ?? null);
    });

    roots.forEach(rootTask => {
      const taskRowId = `task_${rootTask.id}`;
      const tasksInGroup = [
        rootTask,
        ...gatherDescendants(rootTask.id).filter(
          descendant =>
            (descendant.projectId ?? null) === (rootTask.projectId ?? null)
        )
      ];

      const taskRow: GanttRow = {
        type: 'task-group',
        id: taskRowId,
        name: rootTask.name,
        tasks: [rootTask],
        children: [],
        collapsed: collapsedIds.has(taskRowId),
        level: 1,
        parentId: projectRow.id
      };

      const assigneeBuckets = new Map<string, GanttTask[]>();
      tasksInGroup.forEach(task => {
        const assigneeKey =
          task.assigneeId ?? task.responsibleId ?? 'unassigned';
        if (!assigneeBuckets.has(assigneeKey)) {
          assigneeBuckets.set(assigneeKey, []);
        }
        assigneeBuckets.get(assigneeKey)!.push(task);
      });

      assigneeBuckets.forEach((assignedTasks, assigneeKey) => {
        const user =
          assigneeKey !== 'unassigned' ? userMap.get(assigneeKey) : undefined;
        const label =
          assigneeKey === 'unassigned'
            ? 'Не назначено'
            : `${user?.lastName ?? ''} ${user?.name ?? ''}`.trim() ||
              `Пользователь ${assigneeKey}`;
        const assigneeRowId = `assignee_${rootTask.id}_${assigneeKey}`;
        const assigneeRow: GanttRow = {
          type: 'assignee',
          id: assigneeRowId,
          name: label,
          tasks: assignedTasks,
          level: 2,
          parentId: taskRow.id,
          collapsed: collapsedIds.has(assigneeRowId)
        };

        if (!taskRow.children) {
          taskRow.children = [];
        }
        taskRow.children.push(assigneeRow);
      });

      if (!taskRow.children) {
        taskRow.children = [];
      }

      taskRow.children.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      projectRow.children!.push(taskRow);
    });

    if (projectRow.children && projectRow.children.length > 0) {
      projectRow.children.sort((a, b) => {
        const aStart = getAllTasksFromRow(a).reduce(
          (min, task) => Math.min(min, task.start.getTime()),
          Infinity
        );
        const bStart = getAllTasksFromRow(b).reduce(
          (min, task) => Math.min(min, task.start.getTime()),
          Infinity
        );
        return aStart - bStart;
      });
      rows.push(projectRow);
    }
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return rows;
};

// Создание плоского списка задач для gantt-task-react
export const createGanttTaskList = (rows: GanttRow[]): GanttTask[] => {
  const tasks: GanttTask[] = [];

  const traverse = (row: GanttRow, parentId?: string) => {
    const allTasks = getAllTasksFromRow(row);
    if (allTasks.length > 0) {
      const minStart = new Date(
        Math.min(...allTasks.map(t => t.start.getTime()))
      );
      const maxEnd = new Date(
        Math.max(...allTasks.map(t => t.end.getTime()))
      );
      const avgProgress =
        allTasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) /
        allTasks.length;

      const summaryTask: GanttTask = {
        id: row.id,
        name: row.name,
        start: minStart,
        end: maxEnd,
        progress: Number.isFinite(avgProgress) ? avgProgress : 0,
        type: 'project',
        hideChildren: row.collapsed,
        project: parentId,
        styles: {
          backgroundColor:
            row.type === 'project'
              ? '#546e7a'
              : row.type === 'task-group'
              ? '#78909c'
              : '#90a4ae',
          backgroundSelectedColor:
            row.type === 'project'
              ? '#37474f'
              : row.type === 'task-group'
              ? '#607d8b'
              : '#78909c'
        },
        raw: { type: row.type }
      };

      tasks.push(summaryTask);
    }

    if (row.type === 'assignee') {
      row.tasks.forEach(task => {
        const overdueBackground = task.isOverdue
          ? '#f44336'
          : task.styles?.backgroundColor;
        tasks.push({
          ...task,
          project: row.id,
          styles: {
            ...task.styles,
            backgroundColor: overdueBackground,
            backgroundSelectedColor: task.isOverdue
              ? '#e53935'
              : task.styles?.backgroundSelectedColor ?? overdueBackground,
            progressColor: task.isCritical
              ? '#ffeb3b'
              : task.styles?.progressColor ?? '#fff',
            progressSelectedColor: task.isCritical
              ? '#fdd835'
              : task.styles?.progressSelectedColor ?? '#fff'
          }
        });
      });
    }

    row.children?.forEach(child => traverse(child, row.id));
  };

  rows.forEach(row => traverse(row));
  return tasks;
};

// Получение всех задач из строки и её детей
const getAllTasksFromRow = (row: GanttRow): GanttTask[] => {
  const tasks: GanttTask[] = [...row.tasks];
  row.children?.forEach(child => {
    tasks.push(...getAllTasksFromRow(child));
  });
  return tasks;
};

const markCriticalPath = (tasks: GanttTask[]): GanttTask[] => {
  if (tasks.length === 0) {
    return tasks;
  }

  const taskMap = new Map<string, GanttTask>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const memo = new Map<string, number>();
  const getDuration = (task: GanttTask) =>
    Math.max(task.end.getTime() - task.start.getTime(), 0);

  const dfs = (task: GanttTask): number => {
    if (memo.has(task.id)) {
      return memo.get(task.id)!;
    }
    const deps = task.dependencies ?? [];
    if (deps.length === 0) {
      const value = getDuration(task);
      memo.set(task.id, value);
      return value;
    }
    let maxPrev = 0;
    deps.forEach(depId => {
      const depTask = taskMap.get(depId);
      if (depTask) {
        maxPrev = Math.max(maxPrev, dfs(depTask));
      }
    });
    const value = maxPrev + getDuration(task);
    memo.set(task.id, value);
    return value;
  };

  let maxDistance = 0;
  tasks.forEach(task => {
    maxDistance = Math.max(maxDistance, dfs(task));
  });

  const criticalIds = new Set<string>();

  const backtrack = (task: GanttTask) => {
    if (criticalIds.has(task.id)) {
      return;
    }
    criticalIds.add(task.id);
    const deps = task.dependencies ?? [];
    const taskDistance = memo.get(task.id)!;
    deps.forEach(depId => {
      const depTask = taskMap.get(depId);
      if (!depTask) return;
      const depDistance = memo.get(depTask.id);
      if (depDistance === undefined) return;
      if (depDistance + getDuration(task) === taskDistance) {
        backtrack(depTask);
      }
    });
  };

  tasks.forEach(task => {
    if (memo.get(task.id) === maxDistance) {
      backtrack(task);
    }
  });

  return tasks.map(task => ({
    ...task,
    isCritical: criticalIds.has(task.id)
  }));
};

