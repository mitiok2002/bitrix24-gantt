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
      const groupIdRaw = pickField(task, ['GROUP_ID', 'groupId']);
      let projectId: string | undefined;
      if (groupIdRaw !== undefined && groupIdRaw !== null) {
        const normalizedGroup = String(groupIdRaw).trim();
        if (
          normalizedGroup !== '' &&
          normalizedGroup !== '0' &&
          normalizedGroup.toLowerCase() !== 'null' &&
          normalizedGroup.toLowerCase() !== 'undefined'
        ) {
          projectId = normalizedGroup;
        }
      }
      let projectMeta = projectId ? projectMap.get(projectId) : undefined;
      const rawGroup =
        task.GROUP ??
        task.group ??
        task.PROJECT ??
        task.project ??
        null;
      if (projectId && !projectMeta) {
        const rawGroupName =
          (rawGroup && typeof rawGroup === 'object'
            ? rawGroup.NAME ?? rawGroup.name
            : undefined) ??
          pickField(task, ['GROUP_NAME', 'groupName']);

        projectMeta = {
          id: projectId,
          name: rawGroupName ? String(rawGroupName) : `Проект ${projectId}`
        };
        projectMap.set(projectId, projectMeta);
      }
      const projectName = projectMeta?.name;

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
        project: projectId ?? undefined,
        parentId: parentId !== undefined ? String(parentId) : null,
        projectId: projectId ?? null,
        projectName,
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
  collapsedIds: Set<string> = new Set()
): GanttRow[] => {
  const rows: GanttRow[] = [];
  if (tasks.length === 0) {
    return rows;
  }

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

  const projectNameMap = new Map<string, string>();

  const buckets = new Map<string, GanttTask[]>();
  tasks.forEach(task => {
    const projectKey = task.projectId ?? 'unassigned';
    if (task.projectId) {
      const name =
        task.projectMeta?.name ??
        task.projectName ??
        projectNameMap.get(task.projectId) ??
        `Проект ${task.projectId}`;
      projectNameMap.set(task.projectId, name);
    }
    if (!buckets.has(projectKey)) {
      buckets.set(projectKey, []);
    }
    buckets.get(projectKey)!.push(task);
  });

  buckets.forEach((projectTasks, projectId) => {
    if (projectTasks.length === 0) {
      return;
    }

    const projectMeta =
      projectId !== 'unassigned' ? projectMap.get(projectId) : undefined;
    const projectRowId =
      projectId === 'unassigned' ? 'project_unassigned' : `project_${projectId}`;
    const projectRowName =
      projectId === 'unassigned'
        ? 'Без проекта'
        : projectMeta?.name ?? projectNameMap.get(projectId) ?? `Проект ${projectId}`;

    const projectRow: GanttRow = {
      type: 'project',
      id: projectRowId,
      name: projectRowName,
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

    const buildTaskRow = (
      task: GanttTask,
      level: number,
      parentRowId: string
    ): GanttRow => {
      const taskRowId = `task_${task.id}`;
      const childTasks =
        childrenByParent
          .get(task.id)
          ?.filter(
            child =>
              (child.projectId ?? null) === (task.projectId ?? null)
          ) ?? [];

      const sortedChildren = childTasks.sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );

      const childRows = sortedChildren.map(child =>
        buildTaskRow(child, level + 1, taskRowId)
      );

      const rowType: GanttRow['type'] =
        childRows.length > 0 ? 'task-group' : 'task';

      return {
        type: rowType,
        id: taskRowId,
        name: task.name,
        tasks: [task],
        children: childRows,
        collapsed: collapsedIds.has(taskRowId),
        level,
        parentId: parentRowId
      };
    };

    const rootRows = roots
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(rootTask => buildTaskRow(rootTask, 1, projectRow.id));

    projectRow.children = rootRows;

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

  rows.sort((a, b) => {
    const aStart = getEarliestStart(a);
    const bStart = getEarliestStart(b);
    if (aStart !== bStart) {
      return aStart - bStart;
    }
    return a.name.localeCompare(b.name, 'ru');
  });
  return rows;
};

const getEarliestStart = (row: GanttRow): number => {
  const tasks = getAllTasksFromRow(row);
  if (tasks.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.min(...tasks.map((task) => task.start.getTime()));
};

// Создание плоского списка задач для gantt-task-react
export const createGanttTaskList = (rows: GanttRow[]): GanttTask[] => {
  const tasks: GanttTask[] = [];

  const traverse = (row: GanttRow, parentId?: string) => {
    const allTasks = getAllTasksFromRow(row);

    if (row.type === 'task') {
      row.tasks.forEach(task => {
        const baseBackground =
          task.isOverdue && task.type === 'task'
            ? '#f44336'
            : task.styles?.backgroundColor ?? '#4caf50';

        tasks.push({
          ...task,
          project: parentId,
          styles: {
            ...task.styles,
            backgroundColor: task.isOverdue ? '#f44336' : baseBackground,
            backgroundSelectedColor: task.isOverdue
              ? '#e53935'
              : task.styles?.backgroundSelectedColor ?? baseBackground,
            progressColor: task.isCritical
              ? '#ffeb3b'
              : task.styles?.progressColor ?? '#fff',
            progressSelectedColor: task.isCritical
              ? '#fdd835'
              : task.styles?.progressSelectedColor ?? '#fff'
          }
        });
      });
    } else if (allTasks.length > 0) {
      const minStart = new Date(
        Math.min(...allTasks.map(t => t.start.getTime()))
      );
      const maxEnd = new Date(
        Math.max(...allTasks.map(t => t.end.getTime()))
      );
      const avgProgress =
        allTasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) /
        allTasks.length;

      const isProjectRow = row.type === 'project';
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
          backgroundColor: isProjectRow ? '#1f6feb' : '#6d8cff',
          backgroundSelectedColor: isProjectRow ? '#174ea6' : '#5a76d9',
          progressColor: '#ffffff',
          progressSelectedColor: '#ffffff'
        },
        raw: { type: row.type }
      };

      tasks.push(summaryTask);
    }

    const nextParentId = row.type === 'task' ? parentId : row.id;
    row.children?.forEach(child => traverse(child, nextParentId));
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

