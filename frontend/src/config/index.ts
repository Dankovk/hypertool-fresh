export const config = {
  storage: {
    settingsKey: 'studio-settings',
  },
  history: {
    maxVersions: 10,
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
    installCommand: ["npm", "install"] as const,
    devCommand: ["npm", "run", "dev"] as const,
    maxLogEntries: 200,
  },
} as const;
