import { create } from 'zustand';

interface FilterState {
  dateRange: [Date, Date] | null;
  selectedDepartments: string[];
  selectedUsers: string[];
  selectedProjects: string[];
  searchQuery: string;
  statusFilter: string[];
  showOnlyOverdue: boolean;
  showOnlyCritical: boolean;
  collapsedIds: Set<string>;
  
  setDateRange: (range: [Date, Date] | null) => void;
  setSelectedDepartments: (depts: string[]) => void;
  setSelectedUsers: (users: string[]) => void;
  setSelectedProjects: (projects: string[]) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (statuses: string[]) => void;
  setShowOnlyOverdue: (value: boolean) => void;
  setShowOnlyCritical: (value: boolean) => void;
  toggleCollapsed: (id: string) => void;
  collapseAll: (ids: string[]) => void;
  expandAll: () => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: null,
  selectedDepartments: [],
  selectedUsers: [],
  selectedProjects: [],
  searchQuery: '',
  statusFilter: [],
  showOnlyOverdue: false,
  showOnlyCritical: false,
  collapsedIds: new Set(),

  setDateRange: (range) => set({ dateRange: range }),
  setSelectedDepartments: (depts) => set({ selectedDepartments: depts }),
  setSelectedUsers: (users) => set({ selectedUsers: users }),
  setSelectedProjects: (projects) => set({ selectedProjects: projects }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  setShowOnlyOverdue: (value) => set({ showOnlyOverdue: value }),
  setShowOnlyCritical: (value) => set({ showOnlyCritical: value }),
  
  toggleCollapsed: (id) =>
    set((state) => {
      const newSet = new Set(state.collapsedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { collapsedIds: newSet };
    }),
  collapseAll: (ids) =>
    set(() => ({
      collapsedIds: new Set(ids)
    })),
  expandAll: () => set(() => ({ collapsedIds: new Set() })),
  
  resetFilters: () =>
    set({
      dateRange: null,
      selectedDepartments: [],
      selectedUsers: [],
      selectedProjects: [],
      searchQuery: '',
      statusFilter: [],
      showOnlyOverdue: false,
      showOnlyCritical: false
    })
}));


