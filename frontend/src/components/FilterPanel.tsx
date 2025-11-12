import { Card, DatePicker, Select, Input, Button, Space, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useFilterStore } from '../stores/filterStore';
import type { Department, User, BitrixProject } from '../types';

dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;
const { Search } = Input;

interface FilterPanelProps {
  departments: Department[];
  users: User[];
  projects: BitrixProject[];
  stats: {
    total: number;
    overdue: number;
    completed: number;
    critical: number;
  };
}

export const FilterPanel = ({ departments, users, projects, stats }: FilterPanelProps) => {
  const {
    dateRange,
    selectedDepartments,
    selectedUsers,
    selectedProjects,
    searchQuery,
    statusFilter,
    showOnlyOverdue,
    showOnlyCritical,
    setDateRange,
    setSelectedDepartments,
    setSelectedUsers,
    setSelectedProjects,
    setSearchQuery,
    setStatusFilter,
    setShowOnlyOverdue,
    setShowOnlyCritical,
    resetFilters
  } = useFilterStore();

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].toDate(), dates[1].toDate()]);
    } else {
      setDateRange(null);
    }
  };

  const quickDateRanges = [
    {
      label: 'Неделя',
      onClick: () => setDateRange([
        dayjs().startOf('week').toDate(),
        dayjs().endOf('week').toDate()
      ])
    },
    {
      label: 'Месяц',
      onClick: () => setDateRange([
        dayjs().startOf('month').toDate(),
        dayjs().endOf('month').toDate()
      ])
    },
    {
      label: 'Квартал',
      onClick: () => setDateRange([
        dayjs().startOf('quarter').toDate(),
        dayjs().endOf('quarter').toDate()
      ])
    }
  ];

  const statusOptions = [
    { value: '2', label: 'Новая' },
    { value: '3', label: 'В работе' },
    { value: '4', label: 'Ждет контроля' },
    { value: '5', label: 'Завершена' },
    { value: '7', label: 'Отложена' }
  ];

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 16 }}
      title="Фильтры"
      extra={
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={resetFilters}
        >
          Сбросить
        </Button>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Метрики */}
        <Space wrap size={[8, 8]}>
          <Tag color="blue">Всего: {stats.total}</Tag>
          <Tag color="green">Завершено: {stats.completed}</Tag>
          <Tag color="red">Просрочено: {stats.overdue}</Tag>
          <Tag color="gold">Критический путь: {stats.critical}</Tag>
        </Space>

        {/* Поиск */}
        <Search
          placeholder="Поиск по названию задачи"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
        />

        {/* Даты */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Период</div>
          <RangePicker
            style={{ width: '100%' }}
            value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
            onChange={handleDateRangeChange}
            format="DD.MM.YYYY"
          />
          <Space style={{ marginTop: 8 }} size="small">
            {quickDateRanges.map((range) => (
              <Tag
                key={range.label}
                style={{ cursor: 'pointer' }}
                onClick={range.onClick}
              >
                {range.label}
              </Tag>
            ))}
          </Space>
        </div>

        {/* Проекты */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Проекты</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите проекты"
            value={selectedProjects}
            onChange={setSelectedProjects}
            options={[
              { label: 'Без проекта', value: 'unassigned' },
              ...projects.map(project => ({
                label: project.name,
                value: project.id
              }))
            ]}
            maxTagCount="responsive"
          />
        </div>

        {/* Подразделения */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Подразделения</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите подразделения"
            value={selectedDepartments}
            onChange={setSelectedDepartments}
            options={departments.map(dept => ({
              label: dept.name,
              value: dept.id
            }))}
            maxTagCount="responsive"
          />
        </div>

        {/* Сотрудники */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Сотрудники</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите сотрудников"
            value={selectedUsers}
            onChange={setSelectedUsers}
            options={users.map(user => ({
              label: `${user.lastName} ${user.name}`,
              value: user.id
            }))}
            maxTagCount="responsive"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* Быстрые пресеты */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Быстрые пресеты</div>
          <Space size="small" wrap>
            <Tag.CheckableTag
              checked={showOnlyOverdue}
              onChange={(checked) => setShowOnlyOverdue(checked)}
            >
              Просрочено
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={showOnlyCritical}
              onChange={(checked) => setShowOnlyCritical(checked)}
            >
              Критический путь
            </Tag.CheckableTag>
          </Space>
        </div>

        {/* Статусы */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Статус задачи</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите статусы"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            maxTagCount="responsive"
          />
        </div>
      </Space>
    </Card>
  );
};

