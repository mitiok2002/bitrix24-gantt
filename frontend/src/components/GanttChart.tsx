import { useMemo, useRef, useState, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { GanttTask } from '../types';
import { useFilterStore } from '../stores/filterStore';
import dayjs from 'dayjs';
import { CustomTaskListTable } from './CustomTaskListTable';

const CustomTaskListHeader = ({
  headerHeight,
  rowWidth,
  fontFamily,
  fontSize
}: {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${rowWidth} ${rowWidth} ${rowWidth}`,
        borderBottom: '1px solid #e0e0e0',
        borderLeft: '1px solid #e0e0e0',
        borderRight: '1px solid #e0e0e0',
        fontFamily,
        fontSize,
        fontWeight: 600,
        background: '#f5f7fb',
        color: '#1f2933',
        height: headerHeight,
        alignItems: 'center'
      }}
    >
      <div style={{ paddingLeft: 16 }}>Проект / Задача</div>
      <div style={{ borderLeft: '1px solid #e0e0e0', paddingLeft: 16 }}>
        Начало
      </div>
      <div style={{ borderLeft: '1px solid #e0e0e0', paddingLeft: 16 }}>
        Окончание
      </div>
    </div>
  );
};

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
  const rawResponsible =
    rawTask?.responsible?.name || rawTask?.responsible?.NAME;
  const responsibleName =
    rawResponsible ??
    (task.assigneeId ? `Ответственный ID: ${task.assigneeId}` : 'Не назначено');

  return (
    <div
      style={{
        padding: 12,
        background: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: 6,
        minWidth: 220
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {task.name} {task.isCritical ? '🔥' : ''}
      </div>
      <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
        Период: {dayjs(task.start).format('DD.MM.YYYY')} —{' '}
        {dayjs(task.end).format('DD.MM.YYYY')}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#4b5563',
          marginBottom: isRealTask || task.isOverdue ? 4 : 0
        }}
      >
        Ответственный: {responsibleName}
      </div>
      {task.isOverdue && (
        <div
          style={{
            fontSize: 12,
            color: '#d32f2f',
            marginBottom: isRealTask ? 4 : 0
          }}
        >
          Просрочено
        </div>
      )}
      {isRealTask && task.projectName && (
        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
          Проект: {task.projectName}
        </div>
      )}
      {isRealTask && task.status && (
        <div style={{ fontSize: 12, color: '#4b5563' }}>
          Статус: {statusMap[task.status] ?? task.status}
        </div>
      )}
    </div>
  );
};

export const GanttChart = ({ tasks, viewMode }: GanttChartProps) => {
  const toggleCollapsed = useFilterStore((state) => state.toggleCollapsed);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ganttHeight, setGanttHeight] = useState(600);

  const handleExpanderClick = (task: GanttTask) => {
    if (task.type === 'project') {
      toggleCollapsed(task.id);
    }
  };

  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 24;
      setGanttHeight(Math.max(availableHeight, 300));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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

