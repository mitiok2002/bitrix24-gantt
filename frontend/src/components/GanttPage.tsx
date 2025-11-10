import { useMemo, useState } from 'react';
import { Layout, Spin, Alert, Button, Space, Radio } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { ViewMode } from 'gantt-task-react';
import { useAuthStore } from '../stores/authStore';
import { useFilterStore } from '../stores/filterStore';
import { useTasks, useUsers, useDepartments } from '../hooks/useBitrixData';
import { buildGanttRows, createGanttTaskList } from '../utils/dataTransform';
import { GanttChart } from './GanttChart';
import { FilterPanel } from './FilterPanel';

const { Sider, Content, Header } = Layout;

export const GanttPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const collapsedIds = useFilterStore((state) => state.collapsedIds);
  const {
    dateRange,
    selectedDepartments,
    selectedUsers,
    searchQuery,
    statusFilter
  } = useFilterStore();

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: users, isLoading: usersLoading, error: usersError } = useUsers();
  const { data: departments, isLoading: deptsLoading, error: deptsError } = useDepartments();

  const isLoading = tasksLoading || usersLoading || deptsLoading;
  const error = tasksError || usersError || deptsError;

  // Применяем фильтры к данным
  const filteredData = useMemo(() => {
    if (!tasks || !users || !departments) return null;

    // Фильтрация задач
    let filteredTasks = [...tasks];

    // Фильтр по поиску
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по датам
    if (dateRange) {
      filteredTasks = filteredTasks.filter(task => {
        const taskStart = task.start.getTime();
        const taskEnd = task.end.getTime();
        const rangeStart = dateRange[0].getTime();
        const rangeEnd = dateRange[1].getTime();
        
        return (
          (taskStart >= rangeStart && taskStart <= rangeEnd) ||
          (taskEnd >= rangeStart && taskEnd <= rangeEnd) ||
          (taskStart <= rangeStart && taskEnd >= rangeEnd)
        );
      });
    }

    // Фильтруем по статусу
    if (statusFilter.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        task.status ? statusFilter.includes(task.status) : false
      );
    }

    // Фильтрация пользователей
    let filteredUsers = [...users];
    if (selectedUsers.length > 0) {
      filteredUsers = filteredUsers.filter(user =>
        selectedUsers.includes(user.id)
      );
    }

    // Фильтрация подразделений
    let filteredDepartments = [...departments];
    if (selectedDepartments.length > 0) {
      filteredDepartments = filteredDepartments.filter(dept =>
        selectedDepartments.includes(dept.id)
      );
      
      // Также фильтруем пользователей по выбранным подразделениям
      filteredUsers = filteredUsers.filter(user =>
        user.departmentIds.some(deptId => selectedDepartments.includes(deptId))
      );
    }

    return {
      tasks: filteredTasks,
      users: filteredUsers,
      departments: filteredDepartments
    };
  }, [tasks, users, departments, searchQuery, dateRange, selectedUsers, selectedDepartments]);

  // Строим Gantt данные
  const ganttTasks = useMemo(() => {
    if (!filteredData) return [];

    const rows = buildGanttRows(
      filteredData.departments,
      filteredData.users,
      filteredData.tasks,
      collapsedIds
    );

    return createGanttTaskList(rows);
  }, [filteredData, collapsedIds]);

  const handleLogout = () => {
    clearAuth();
  };

  if (isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <Alert
          type="error"
          message="Ошибка загрузки данных"
          description={String(error)}
          showIcon
        />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{ margin: 0 }}>Bitrix24 Gantt Diagram</h2>
        
        <Space>
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <Radio.Button value={ViewMode.Day}>День</Radio.Button>
            <Radio.Button value={ViewMode.Week}>Неделя</Radio.Button>
            <Radio.Button value={ViewMode.Month}>Месяц</Radio.Button>
          </Radio.Group>
          
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Выход
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider 
          width={350} 
          style={{ 
            background: '#fff',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          {departments && users && (
            <FilterPanel departments={departments} users={users} />
          )}
        </Sider>

        <Content style={{ 
          padding: '24px',
          background: '#f0f2f5',
          overflowY: 'auto'
        }}>
          <div style={{ 
            background: '#fff', 
            padding: '24px',
            borderRadius: '8px',
            minHeight: '100%'
          }}>
            <GanttChart tasks={ganttTasks} viewMode={viewMode} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

