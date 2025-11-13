import { useMemo } from "react";
import type { Task } from "gantt-task-react";

export const TASK_LIST_COLUMN_WIDTHS = {
  name: 260,
  start: 180,
  end: 180,
  responsible: 220,
  status: 160,
} as const;

const STATUS_LABELS: Record<string, string> = {
  "2": "Новая",
  "3": "В работе",
  "4": "Ждёт контроля",
  "5": "Завершена",
  "7": "Отложена",
};

type CustomTaskListTableProps = {
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: Task[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: Task) => void;
};

const localeDateStringCache = new Map<string, string>();

const toLocaleDateStringFactory = (locale: string) => {
  return (date: Date, options: Intl.DateTimeFormatOptions) => {
    const key = `${locale}-${options.weekday}-${date.toISOString()}`;
    const cached = localeDateStringCache.get(key);
    if (cached) {
      return cached;
    }
    const formatted = date.toLocaleDateString(locale, options);
    localeDateStringCache.set(key, formatted);
    return formatted;
  };
};

type RawTask = {
  type?: string;
  responsible?: {
    name?: string;
    NAME?: string;
  };
  RESPONSIBLE_NAME?: string;
  RESPONSIBLE_FULL_NAME?: string;
  RESPONSIBLE_ID?: string;
  status?: string;
  STATUS?: string;
};

type ExtendedTask = Task & {
  raw?: RawTask;
  isCritical?: boolean;
  isOverdue?: boolean;
  status?: string;
  assigneeId?: string;
  responsibleId?: string;
};

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const getRowTheme = (task: Task) => {
  const extended = task as ExtendedTask;
  const rawType =
    extended.raw?.type ?? (task.type === "project" ? "project" : "task");

  switch (rawType) {
    case "project":
      return {
        background: "#eef3ff",
        color: "#1b3a8a",
        fontWeight: 700,
      };
    case "task-group":
      return {
        background: "#f7f9ff",
        color: "#243b6b",
        fontWeight: 600,
      };
    default:
      return {
        background: "#ffffff",
        color: "#1f1f1f",
        fontWeight: 400,
      };
  }
};

const computeIndent = (task: Task, taskMap: Map<string, Task>) => {
  let level = 0;
  let currentParent = task.project;

  while (currentParent) {
    const parentTask = taskMap.get(currentParent);
    if (!parentTask) {
      break;
    }
    level += 1;
    currentParent = parentTask.project;
  }

  return level;
};

export const CustomTaskListTable = ({
  rowHeight,
  rowWidth: _rowWidth,
  tasks,
  fontFamily,
  fontSize,
  locale,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
}: CustomTaskListTableProps) => {
  void selectedTaskId;
  void setSelectedTask;

  const toLocaleDateString = useMemo(
    () => toLocaleDateStringFactory(locale),
    [locale]
  );

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        borderLeft: "1px solid #e0e0e0",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      {tasks.map((task) => {
        const extended = task as ExtendedTask;
        const rawTask = extended.raw;
        const theme = getRowTheme(task);
        const indent = computeIndent(task, taskMap);
        const expanderSymbol =
          task.hideChildren === false
            ? "▼"
            : task.hideChildren === true
            ? "▶"
            : "";
        const showExpander = Boolean(expanderSymbol);
        const startWidth = `${TASK_LIST_COLUMN_WIDTHS.start}px`;
        const endWidth = `${TASK_LIST_COLUMN_WIDTHS.end}px`;
        const responsibleWidth = `${TASK_LIST_COLUMN_WIDTHS.responsible}px`;
        const statusWidth = `${TASK_LIST_COLUMN_WIDTHS.status}px`;
        const nameWidth = `${TASK_LIST_COLUMN_WIDTHS.name}px`;
        const responsibleLabel =
          rawTask?.responsible?.name ??
          rawTask?.responsible?.NAME ??
          rawTask?.RESPONSIBLE_FULL_NAME ??
          rawTask?.RESPONSIBLE_NAME ??
          extended.assigneeId ??
          extended.responsibleId ??
          "—";
        const rawStatus = rawTask?.STATUS ?? rawTask?.status ?? extended.status;
        const statusLabel =
          task.type === "task" && rawStatus
            ? STATUS_LABELS[rawStatus] ?? rawStatus
            : "—";

        return (
          <div
            key={`${task.id}-row`}
            style={{
              display: "flex",
              height: rowHeight,
              alignItems: "center",
              background: theme.background,
              borderBottom: "1px solid #eef1f7",
            }}
          >
            <div
              title={task.name}
              style={{
                minWidth: nameWidth,
                maxWidth: nameWidth,
                paddingLeft: 12 + indent * 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: theme.fontWeight,
                color: theme.color,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {showExpander ? (
                <span
                  style={{
                    cursor: "pointer",
                    width: 16,
                    display: "inline-flex",
                    justifyContent: "center",
                    color: "#2f3a67",
                  }}
                  onClick={() => onExpanderClick(task)}
                >
                  {expanderSymbol}
                </span>
              ) : (
                <span style={{ width: 16 }} />
              )}
              <span>
                {task.name}
                {task.type === "task" && (task as any).isCritical ? " 🔥" : ""}
              </span>
            </div>

            <div
              style={{
                minWidth: startWidth,
                maxWidth: startWidth,
                color: "#4d5b7c",
                fontSize,
              }}
            >
              &nbsp;
              {toLocaleDateString(task.start, dateTimeOptions)}
            </div>

            <div
              style={{
                minWidth: endWidth,
                maxWidth: endWidth,
                color: "#4d5b7c",
                fontSize,
              }}
            >
              &nbsp;
              {toLocaleDateString(task.end, dateTimeOptions)}
            </div>

            <div
              style={{
                minWidth: responsibleWidth,
                maxWidth: responsibleWidth,
                color: "#4d5b7c",
                fontSize,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              &nbsp;{responsibleLabel}
            </div>

            <div
              style={{
                minWidth: statusWidth,
                maxWidth: statusWidth,
                color: "#4d5b7c",
                fontSize,
              }}
            >
              &nbsp;{statusLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
};

