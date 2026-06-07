import { create } from 'zustand'

export const useGroupInviteStore = create((set) => ({
  invitations: [],

  setInvitations: (invitations) => set({ invitations }),

  addInvitation: (inv) =>
    set((state) => {
      const exists = state.invitations.some(i => i.id === inv.id)
      if (exists) return state
      return { invitations: [inv, ...state.invitations] }
    }),

  removeInvitation: (invId) =>
    set((state) => ({
      invitations: state.invitations.filter(i => i.id !== invId)
    })),

  clearInvitations: () => set({ invitations: [] }),
}))