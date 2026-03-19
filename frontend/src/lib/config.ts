export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Fintale Timesheet",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
};
