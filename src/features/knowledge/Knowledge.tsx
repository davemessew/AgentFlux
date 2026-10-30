import {
  Database,
  Download,
  FileText,
  Inbox,
  LockKeyhole,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RecordItem } from "../../../shared/domain";
import {
  Button,
  Empty,
  IconBox,
  Modal,
  PageHeading,
} from "../../components/ui";
import { api, errorMessage, post } from "../../lib/api";
import { cx, downloadJson, formatDate } from "../../lib/format";
import type { PageProps } from "../../lib/props";
import { SpreadsheetImport } from "./SpreadsheetImport";

export function DataPage({
  data,
  upload,
  busy,
  act,
  notify,
  refresh,
}: PageProps & {
  upload: (files: FileList | File[]) => Promise<unknown>;
  busy: string;
}) {
  const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
  const importFiles = (files: FileList | File[]) => {
    const items = Array.from(files);
    if (items.some((file) => file.name.toLowerCase().endsWith(".xlsx"))) {
      if (items.length !== 1) {
        notify(
          "Import one spreadsheet at a time to select its sheet and headers.",
          true,
        );
        return;
      }
      setSpreadsheet(items[0]);
    } else void upload(files);
  };
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = () =>
    api<RecordItem[]>("/records")
      .then(setRecords)
      .catch((e: unknown) => notify(errorMessage(e), true));
  useEffect(() => {
    load();
    window.addEventListener("records-changed", load);
    return () => window.removeEventListener("records-changed", load);
  }, [data.stats.records]);
  const visible = records.filter((r) =>
    `${r.title} ${r.content} ${r.source}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      {spreadsheet && (
        <SpreadsheetImport
          file={spreadsheet}
          close={() => setSpreadsheet(null)}
          done={(count) => {
            notify(`${count} rows imported.`);
            void load();
            void refresh();
          }}
        />
      )}
      <PageHeading
        title="Documents and data"
        description="Imported files, API data and saved workflow results."
      >
        <Button
          icon={Upload}
          variant="primary"
          onClick={() => input.current?.click()}
          disabled={!!busy}
        >
          Add files
        </Button>
      </PageHeading>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={data.capabilities.formats.join(",")}
        onChange={(e) => {
          if (e.target.files?.length) importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        className={cx("upload-zone", drag && "drag-over")}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter") input.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
        }}
      >
        <div className="upload-visual">
          <FileText size={23} />
          <span>
            <Plus size={13} />
          </span>
        </div>
        <div>
          <strong>
            {busy === "upload" ? "Importing files …" : "Import files"}
          </strong>
          <p>
            Drop files here or <span>browse</span>
          </p>
          <small>
            PDF, DOCX, XLSX, CSV, JSON, Markdown and text · up to 12 MB per file
          </small>
        </div>
        <span className="upload-local">
          <LockKeyhole size={14} />
          Stored locally
        </span>
      </div>
      <div className="table-toolbar">
        <h2>
          All documents <span className="count-badge">{records.length}</span>
        </h2>
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder="Search documents …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {visible.length ? (
        <div className="data-table">
          <div className="table-head">
            <span>Document</span>
            <span>Source</span>
            <span>Classification</span>
            <span>Added</span>
            <span />
          </div>
          {visible.map((r) => (
            <div className="table-row" key={r.id}>
              <button className="document-name" onClick={() => setSelected(r)}>
                <IconBox icon={FileText} color="blue" />
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.content.length.toLocaleString("en-GB")} characters
                  </small>
                </span>
              </button>
              <span className="source-name">{r.source}</span>
              <span>
                <span className="badge">
                  {r.classification === "public"
                    ? "Public"
                    : r.classification === "sensitive"
                      ? "Sensitive"
                      : "Internal"}
                </span>
              </span>
              <span className="table-date">{formatDate(r.createdAt)}</span>
              <button
                className="icon-button"
                aria-label={`Delete ${r.title}`}
                onClick={() =>
                  act("delete", async () => {
                    await api<RecordItem[]>("/records/" + r.id, {
                      method: "DELETE",
                    });
                    await load();
                    await refresh();
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={Database}
          title={query ? "No matching documents" : "No documents yet"}
          description={
            query
              ? "Try another search term."
              : "Upload files or start with the synthetic sample data."
          }
        >
          {!query && (
            <Button
              icon={Inbox}
              onClick={() =>
                act("import", async () => {
                  const result = await post<{ count: number }>(
                    "/connectors/inbox/import",
                  );
                  await load();
                  await refresh();
                  notify(`${result.count} sample records imported.`);
                })
              }
            >
              Import sample data
            </Button>
          )}
        </Empty>
      )}
      {selected && (
        <Modal
          title={selected.title}
          description={`${selected.source} · ${formatDate(selected.createdAt)}`}
          wide
          onClose={() => setSelected(null)}
        >
          <div className="document-content">{selected.content}</div>
          <Button
            icon={Download}
            onClick={() => downloadJson(selected, selected.title + ".json")}
          >
            Export as JSON
          </Button>
        </Modal>
      )}
    </div>
  );
}
