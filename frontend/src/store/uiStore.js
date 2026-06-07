import { create } from 'zustand'

export const useUiStore = create((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  theme: localStorage.getItem('theme') || 'dark',

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))