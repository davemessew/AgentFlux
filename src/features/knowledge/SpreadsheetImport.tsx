import { useEffect, useState } from "react";
import type { Json } from "../../../shared/domain";
import { Button, Field, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";

interface Preview {
  sheets: string[];
  columns: Record<string, string[]>;
  rows: { fields: Record<string, Json>; sheet: string; row: number }[];
  totalRows: number;
}
export function SpreadsheetImport({
  file,
  close,
  done,
}: {
  file: File;
  close: () => void;
  done: (count: number) => void;
}) {
  const [sheet, setSheet] = useState(""),
    [headerRow, setHeaderRow] = useState(1);
  const [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const body = new FormData();
      body.append("file", file);
      body.append("sheet", sheet);
      body.append("headerRow", String(headerRow));
      setPreview(null);
      setError("");
      void api<Preview>("/uploads/preview", {
        method: "POST",
        body,
        signal: controller.signal,
      })
        .then(setPreview)
        .catch((cause) => {
          if (!controller.signal.aborted) setError(errorMessage(cause));
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [file, sheet, headerRow]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("files", file);
      body.append("sheet", sheet);
      body.append("headerRow", String(headerRow));
      const result = await api<{ count: number }>("/uploads", {
        method: "POST",
        body,
      });
      done(result.count);
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title="Import spreadsheet"
      description={file.name}
      onClose={close}
    >
      <div className="form-two">
        <Field label="Sheet">
          <select
            value={sheet}
            onChange={(event) => setSheet(event.target.value)}
          >
            <option value="">All sheets</option>
            {(preview?.sheets || (sheet ? [sheet] : [])).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Field label="Header row">
          <input
            type="number"
            min={1}
            max={100}
            value={headerRow}
            onChange={(event) => setHeaderRow(Number(event.target.value))}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="step-error">
          {error}
        </p>
      )}
      {preview ? (
        <>
          <p>
            {preview.totalRows} data rows. Sheet names and row numbers are kept
            with every record.
          </p>
          <div className="spreadsheet-preview">
            <table>
              <thead>
                <tr>
                  <th>Source row</th>
                  <th>Named fields</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={`${row.sheet}:${row.row}`}>
                    <td>
                      {row.sheet}:{row.row}
                    </td>
                    <td>
                      <pre>{JSON.stringify(row.fields, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        !error && <p role="status">Reading headers and preview…</p>
      )}
      <div className="modal-actions">
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="primary"
          disabled={busy || !preview || preview.totalRows > 500}
          onClick={() => void save()}
        >
          {busy ? "Importing…" : "Import rows"}
        </Button>
      </div>
    </Modal>
  );
}
