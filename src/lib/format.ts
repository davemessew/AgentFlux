import type { RecordItem } from "../../shared/domain";

export const formatDate = (date?: string) =>
  date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))
    : "Not yet";

export const duration = (ms: number) =>
  ms < 1000 ? `${ms || 0} ms` : `${(ms / 1000).toFixed(1)} s`;

export const cx = (...values: unknown[]) => values.filter(Boolean).join(" ");

export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(records: RecordItem[], name: string) {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ["Title", "Content", "Source"],
    ...records.map((r) => [r.title, r.content, r.source]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
