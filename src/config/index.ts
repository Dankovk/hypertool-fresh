export const config = {
  storage: {
    settingsKey: 'studio-settings',
  },
  history: {
    maxVersions: 10,
  },
  sandpack: {
    recompileDelay: 500,
    theme: 'dark' as const,
    template: 'parcel' as const,
  },
} as const;
