import { useMemo } from "react";
import type { Task } from "gantt-task-react";

type CustomTaskListTableProps = {
  rowHeight: number;
  rowWidth: number;
  tasks: Task[];
  fontFamily: string;
  fontSize: string;
  locale: string;
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

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const getRowTheme = (task: Task) => {
  const rawType =
    (task.raw as { type?: string } | undefined)?.type ??
    (task.type === "project" ? "project" : "task");

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
  rowWidth,
  tasks,
  fontFamily,
  fontSize,
  locale,
  onExpanderClick,
}: CustomTaskListTableProps) => {
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
        const theme = getRowTheme(task);
        const indent = computeIndent(task, taskMap);
        const expanderSymbol =
          task.hideChildren === false
            ? "▼"
            : task.hideChildren === true
            ? "▶"
            : "";
        const showExpander = Boolean(expanderSymbol);

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
                minWidth: rowWidth,
                maxWidth: rowWidth,
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
              <span>{task.name}</span>
            </div>

            <div
              style={{
                minWidth: rowWidth,
                maxWidth: rowWidth,
                color: "#4d5b7c",
                fontSize,
              }}
            >
              &nbsp;
              {toLocaleDateString(task.start, dateTimeOptions)}
            </div>

            <div
              style={{
                minWidth: rowWidth,
                maxWidth: rowWidth,
                color: "#4d5b7c",
                fontSize,
              }}
            >
              &nbsp;
              {toLocaleDateString(task.end, dateTimeOptions)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

