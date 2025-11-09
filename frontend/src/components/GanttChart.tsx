import { useMemo } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { GanttTask } from '../types';
import { useFilterStore } from '../stores/filterStore';

interface GanttChartProps {
  tasks: GanttTask[];
  viewMode: ViewMode;
}

export const GanttChart = ({ tasks, viewMode }: GanttChartProps) => {
  const toggleCollapsed = useFilterStore((state) => state.toggleCollapsed);

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
    <div style={{ width: '100%', height: '100%' }}>
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        locale="ru"
        columnWidth={columnWidth}
        listCellWidth="200px"
        onExpanderClick={handleExpanderClick}
        ganttHeight={600}
        barBackgroundColor="#4caf50"
        barBackgroundSelectedColor="#2196f3"
        arrowColor="#999"
        fontSize="14px"
        fontFamily="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        todayColor="rgba(255, 193, 7, 0.3)"
      />
    </div>
  );
};

