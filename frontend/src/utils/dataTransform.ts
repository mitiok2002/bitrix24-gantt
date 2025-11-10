import type { GanttTask, Department, User, GanttRow } from '../types';
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

export const transformBitrixTasks = (bitrixTasks: any[]): GanttTask[] => {
  return bitrixTasks
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

      return {
        id: String(id),
        name: String(title),
        start,
        end,
        progress,
        type: 'task' as const,
        status: status ? String(status) : undefined,
        responsibleId: String(responsibleId),
        raw: task,
        styles: {
          backgroundColor,
          backgroundSelectedColor: backgroundColor,
          progressColor: '#fff',
          progressSelectedColor: '#fff'
        },
        project: String(responsibleId) // Привязываем к ответственному
      };
    });
};

// Построение дерева подразделений с пользователями
export const buildDepartmentTree = (
  departments: Department[],
  users: User[]
): Department[] => {
  // Создаем копию массива подразделений
  const deptMap = new Map<string, Department>();
  departments.forEach(dept => {
    deptMap.set(dept.id, { ...dept, users: [] });
  });

  // Распределяем пользователей по подразделениям
  users.forEach(user => {
    if (user.departmentIds && user.departmentIds.length > 0) {
      // Берем первое подразделение пользователя
      const deptId = user.departmentIds[0];
      const dept = deptMap.get(deptId);
      if (dept) {
        dept.users.push(user);
      }
    }
  });

  // Строим дерево
  const rootDepts: Department[] = [];
  deptMap.forEach(dept => {
    if (!dept.parent || dept.parent === '0') {
      rootDepts.push(dept);
    }
  });

  return rootDepts.sort((a, b) => a.sort - b.sort);
};

// Построение строк Gantt с деревом подразделений и пользователей
export const buildGanttRows = (
  departments: Department[],
  users: User[],
  tasks: GanttTask[],
  collapsedIds: Set<string> = new Set()
): GanttRow[] => {
  const rows: GanttRow[] = [];
  const deptWithUsers = buildDepartmentTree(departments, users);

  const buildRows = (depts: Department[], level: number = 0, parentId?: string) => {
    depts.forEach(dept => {
      // Добавляем строку подразделения
      const deptRow: GanttRow = {
        type: 'department',
        id: `dept_${dept.id}`,
        name: dept.name,
        tasks: [],
        children: [],
        collapsed: collapsedIds.has(`dept_${dept.id}`),
        level,
        parentId
      };

      rows.push(deptRow);

      // Если подразделение не свернуто, добавляем его пользователей
      if (!deptRow.collapsed) {
        dept.users.forEach(user => {
          // Получаем задачи пользователя
          const userTasks = tasks.filter(task => task.project === user.id);

          const userRow: GanttRow = {
            type: 'user',
            id: `user_${user.id}`,
            name: `${user.lastName} ${user.name}`,
            tasks: userTasks,
            level: level + 1,
            parentId: deptRow.id
          };

          rows.push(userRow);
        });

        // Рекурсивно обрабатываем дочерние подразделения
        const childDepts = departments.filter(d => d.parent === dept.id);
        if (childDepts.length > 0) {
          buildRows(childDepts, level + 1, deptRow.id);
        }
      }
    });
  };

  buildRows(deptWithUsers);
  return rows;
};

// Создание плоского списка задач для gantt-task-react
export const createGanttTaskList = (rows: GanttRow[]): GanttTask[] => {
  const tasks: GanttTask[] = [];

  rows.forEach(row => {
    if (row.type === 'department') {
      // Для подразделения создаем project task
      const deptTasks = getAllTasksFromRow(row, rows);
      if (deptTasks.length > 0) {
        const minStart = new Date(Math.min(...deptTasks.map(t => t.start.getTime())));
        const maxEnd = new Date(Math.max(...deptTasks.map(t => t.end.getTime())));
        
        tasks.push({
          id: row.id,
          name: row.name,
          start: minStart,
          end: maxEnd,
          progress: 0,
          type: 'project',
          hideChildren: row.collapsed,
          styles: {
            backgroundColor: '#9e9e9e',
            backgroundSelectedColor: '#757575'
          }
        });
      }
    } else if (row.type === 'user' && row.tasks.length > 0) {
      // Добавляем задачи пользователя
      row.tasks.forEach(task => {
        tasks.push({
          ...task,
          project: row.parentId // Привязываем к родительскому подразделению
        });
      });
    }
  });

  return tasks;
};

// Получение всех задач из строки и её детей
const getAllTasksFromRow = (row: GanttRow, allRows: GanttRow[]): GanttTask[] => {
  const tasks: GanttTask[] = [...row.tasks];
  
  // Находим всех детей
  const children = allRows.filter(r => r.parentId === row.id);
  children.forEach(child => {
    tasks.push(...getAllTasksFromRow(child, allRows));
  });

  return tasks;
};

