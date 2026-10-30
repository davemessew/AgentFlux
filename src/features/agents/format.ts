export const dateText = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "No runs yet";
export const statusText: Record<string, string> = {
  idle: "Ready",
  waiting: "Waiting for your answer",
  delivering: "Delivering results",
  planning: "Planning workflow",
  running: "Running",
  stopping: "Stopping",
  learning: "Learning",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Stopped",
  interrupted: "Interrupted",
};
