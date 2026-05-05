import { create } from 'zustand'

interface ShellStore {
  launcherOpen: boolean
  overviewOpen: boolean
  quickSettingsOpen: boolean
  setLauncherOpen: (v: boolean) => void
  setOverviewOpen: (v: boolean) => void
  setQuickSettingsOpen: (v: boolean) => void
  closeAll: () => void
}

export const useShellStore = create<ShellStore>((set) => ({
  launcherOpen: false,
  overviewOpen: false,
  quickSettingsOpen: false,
  setLauncherOpen: (v) => set({ launcherOpen: v }),
  setOverviewOpen: (v) => set({ overviewOpen: v }),
  setQuickSettingsOpen: (v) => set({ quickSettingsOpen: v }),
  closeAll: () => set({ launcherOpen: false, overviewOpen: false, quickSettingsOpen: false })
}))
