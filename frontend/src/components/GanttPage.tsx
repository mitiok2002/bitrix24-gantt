import { useMemo, useState } from "react";
import { Layout, Spin, Alert, Button, Space, Radio } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { ViewMode } from "gantt-task-react";
import { useAuthStore } from "../stores/authStore";
import { useFilterStore } from "../stores/filterStore";
import { useTasks, useUsers, useDepartments } from "../hooks/useBitrixData";
import { buildGanttRows, createGanttTaskList } from "../utils/dataTransform";
import type { BitrixProject } from "../types";
import { GanttChart } from "./GanttChart";
import { FilterPanel } from "./FilterPanel";

const { Sider, Content, Header } = Layout;

export const GanttPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const {
    dateRange,
    selectedDepartments,
    selectedUsers,
    selectedProjects,
    searchQuery,
    statusFilter,
    showOnlyOverdue,
    showOnlyCritical,
  } = useFilterStore();

  const { collapsedIds, collapseAll, expandAll } = useFilterStore((state) => ({
    collapsedIds: state.collapsedIds,
    collapseAll: state.collapseAll,
    expandAll: state.expandAll,
  }));

  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks();
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useUsers();
  const {
    data: departments,
    isLoading: deptsLoading,
    error: deptsError,
  } = useDepartments();

  const isLoading = tasksLoading || usersLoading || deptsLoading;
  const error = tasksError || usersError || deptsError;

  // Применяем фильтры к данным
  const filteredData = useMemo(() => {
    if (!tasksData || !users || !departments) return null;

    let filteredTasks = [...(tasksData.ganttTasks ?? [])];

    const userMap = new Map(users.map((user) => [user.id, user]));

    if (searchQuery) {
      filteredTasks = filteredTasks.filter((task) =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateRange) {
      filteredTasks = filteredTasks.filter((task) => {
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

    if (statusFilter.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        task.status ? statusFilter.includes(task.status) : false
      );
    }

    if (selectedUsers.length > 0) {
      const selectedUsersSet = new Set(selectedUsers);
      filteredTasks = filteredTasks.filter((task) => {
        const assigneeId = task.assigneeId ?? task.responsibleId;
        return assigneeId ? selectedUsersSet.has(assigneeId) : false;
      });
    }

    if (selectedDepartments.length > 0) {
      const selectedDepartmentsSet = new Set(selectedDepartments);
      filteredTasks = filteredTasks.filter((task) => {
        const assigneeId = task.assigneeId ?? task.responsibleId;
        if (!assigneeId) {
          return false;
        }
        const assignee = userMap.get(assigneeId);
        if (!assignee) {
          return false;
        }
        return assignee.departmentIds.some((deptId) =>
          selectedDepartmentsSet.has(deptId)
        );
      });
    }

    if (selectedProjects.length > 0) {
      filteredTasks = filteredTasks.filter((task) => {
        const projectKey = task.projectId ?? "unassigned";
        return selectedProjects.includes(projectKey);
      });
    }

    if (showOnlyOverdue) {
      filteredTasks = filteredTasks.filter((task) => task.isOverdue);
    }

    if (showOnlyCritical) {
      filteredTasks = filteredTasks.filter((task) => task.isCritical);
    }

    const filteredUsers =
      selectedDepartments.length > 0
        ? users.filter((user) =>
            user.departmentIds.some((deptId) =>
              selectedDepartments.includes(deptId)
            )
          )
        : users;

    const filteredDepartments = departments;

    const projectMap = new Map<string, BitrixProject>();
    (tasksData.projects ?? []).forEach((project) => {
      projectMap.set(project.id, project);
    });

    (tasksData.ganttTasks ?? []).forEach((task) => {
      if (!task.projectId) {
        return;
      }
      if (!projectMap.has(task.projectId)) {
        const name =
          task.projectMeta?.name ??
          task.projectName ??
          `Проект ${task.projectId}`;
        projectMap.set(task.projectId, {
          id: task.projectId,
          name,
        });
      }
    });

    return {
      tasks: filteredTasks,
      users: filteredUsers,
      departments: filteredDepartments,
      projects: Array.from(projectMap.values()),
    };
  }, [
    tasksData,
    users,
    departments,
    searchQuery,
    dateRange,
    selectedUsers,
    selectedDepartments,
    selectedProjects,
    statusFilter,
    showOnlyOverdue,
    showOnlyCritical,
  ]);

  const summaryStats = useMemo(() => {
    const allTasks = tasksData?.ganttTasks ?? [];
    return {
      total: allTasks.length,
      overdue: allTasks.filter((task) => task.isOverdue).length,
      completed: allTasks.filter((task) => (task.progress ?? 0) >= 100).length,
      critical: allTasks.filter((task) => task.isCritical).length,
    };
  }, [tasksData]);

  // Строим Gantt данные
  const { ganttTasks, projectRowIds } = useMemo(() => {
    if (!filteredData) {
      return { ganttTasks: [], projectRowIds: [] as string[] };
    }

    const rows = buildGanttRows(
      filteredData.tasks,
      filteredData.projects,
      collapsedIds
    );

    return {
      ganttTasks: createGanttTaskList(rows),
      projectRowIds: rows.map((row) => row.id),
    };
  }, [filteredData, collapsedIds]);

  const handleCollapseAll = () => {
    if (projectRowIds.length === 0) return;
    collapseAll(projectRowIds);
  };

  const handleExpandAll = () => {
    expandAll();
  };

  const handleLogout = () => {
    clearAuth();
  };

  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px" }}>
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
    <Layout style={{ height: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ margin: 0 }}>Bitrix24 Gantt Diagram</h2>

        <Space>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <Radio.Button value={ViewMode.Day}>День</Radio.Button>
            <Radio.Button value={ViewMode.Week}>Неделя</Radio.Button>
            <Radio.Button value={ViewMode.Month}>Месяц</Radio.Button>
          </Radio.Group>

          <Space size={8}>
            <Button
              size="small"
              onClick={handleCollapseAll}
              disabled={projectRowIds.length === 0}
            >
              Свернуть все
            </Button>
            <Button
              size="small"
              onClick={handleExpandAll}
              disabled={projectRowIds.length === 0}
            >
              Развернуть все
            </Button>
          </Space>

          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Выход
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider
          width={350}
          style={{
            background: "#fff",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          {departments && users && filteredData && (
            <FilterPanel
              departments={departments}
              users={users}
              projects={filteredData.projects ?? []}
              stats={summaryStats}
            />
          )}
        </Sider>

        <Content
          style={{
            padding: "24px",
            background: "#f0f2f5",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minHeight: "100%",
            }}
          >
            <GanttChart tasks={ganttTasks} viewMode={viewMode} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
