import { create } from 'zustand';

interface FilterState {
  dateRange: [Date, Date] | null;
  selectedDepartments: string[];
  selectedUsers: string[];
  searchQuery: string;
  statusFilter: string[];
  collapsedIds: Set<string>;
  
  setDateRange: (range: [Date, Date] | null) => void;
  setSelectedDepartments: (depts: string[]) => void;
  setSelectedUsers: (users: string[]) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (statuses: string[]) => void;
  toggleCollapsed: (id: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: null,
  selectedDepartments: [],
  selectedUsers: [],
  searchQuery: '',
  statusFilter: [],
  collapsedIds: new Set(),

  setDateRange: (range) => set({ dateRange: range }),
  setSelectedDepartments: (depts) => set({ selectedDepartments: depts }),
  setSelectedUsers: (users) => set({ selectedUsers: users }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  
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
  
  resetFilters: () =>
    set({
      dateRange: null,
      selectedDepartments: [],
      selectedUsers: [],
      searchQuery: '',
      statusFilter: []
    })
}));


