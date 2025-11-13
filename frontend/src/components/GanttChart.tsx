import { useMemo, useRef, useState, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { GanttTask } from '../types';
import { useFilterStore } from '../stores/filterStore';
import dayjs from 'dayjs';
import { CustomTaskListTable } from './CustomTaskListTable';
import { CustomTaskListHeader } from './CustomTaskListHeader';

interface GanttChartProps {
  tasks: GanttTask[];
  viewMode: ViewMode;
}

const statusMap: Record<string, string> = {
  '2': 'Новая',
  '3': 'В работе',
  '4': 'Ждёт контроля',
  '5': 'Завершена',
  '7': 'Отложена'
};

const CustomTooltip = ({ task }: { task: GanttTask }) => {
  const rawTask = task.raw as Record<string, any> | undefined;
  const isRealTask = task.type === 'task';
  const rawId =
    rawTask?.ID ?? rawTask?.id ?? rawTask?.taskId ?? rawTask?.ID?.toString();
  const taskId = String(rawId ?? task.id);
  const rawResponsible =
    rawTask?.responsible?.name || rawTask?.responsible?.NAME;
  const responsibleName =
    rawResponsible ??
    (task.assigneeId ? `Ответственный ID: ${task.assigneeId}` : 'Не назначено');

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {isRealTask ? `#${taskId} · ${task.name}` : task.name}
      </div>
      {isRealTask && (
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
          Название: {task.name}
        </div>
      )}
      {isRealTask && (
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
          ID: {taskId}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#555' }}>
        Период: {dayjs(task.start).format('DD.MM.YYYY')} —{' '}
        {dayjs(task.end).format('DD.MM.YYYY')}
      </div>
      {task.projectName && (
        <div style={{ fontSize: 12, color: '#555' }}>
          Проект: {task.projectName}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#555' }}>
        Ответственный: {responsibleName}
      </div>
      {task.status && (
        <div style={{ fontSize: 12, color: '#555' }}>
          Статус: {statusMap[task.status] ?? task.status}
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {task.isOverdue && <span style={tagStyle('#f44336')}>Просрочено</span>}
        {task.isCritical && (
          <span style={tagStyle('#ffa000')}>Критический путь</span>
        )}
      </div>
    </div>
  );
};

const tagStyle = (background: string): React.CSSProperties => ({
  background,
  color: '#fff',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5
});

export const GanttChart = ({ tasks, viewMode }: GanttChartProps) => {
  const toggleCollapsed = useFilterStore((state) => state.toggleCollapsed);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ganttHeight, setGanttHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 24;
      setGanttHeight(Math.max(availableHeight, 400));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleExpanderClick = (task: GanttTask) => {
    if (task.type === 'project') {
      toggleCollapsed(task.id);
    }
  };

  const columnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day:
        return 60;
      case ViewMode.Week:
        return 250;
      case ViewMode.Month:
        return 300;
      default:
        return 60;
    }
  }, [viewMode]);

  if (tasks.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#999'
      }}>
        Нет задач для отображения
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        locale="ru"
        columnWidth={columnWidth}
        listCellWidth="260px"
        onExpanderClick={handleExpanderClick}
        ganttHeight={ganttHeight}
        barBackgroundColor="#4caf50"
        barBackgroundSelectedColor="#2196f3"
        barProgressColor="#0277bd"
        barProgressSelectedColor="#01579b"
        arrowColor="#9e9e9e"
        fontSize="14px"
        fontFamily="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        todayColor="rgba(255, 193, 7, 0.3)"
        TooltipContent={CustomTooltip}
        TaskListTable={CustomTaskListTable}
        TaskListHeader={CustomTaskListHeader}
      />
    </div>
  );
};

