import { BookOpen, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import type { Skill } from "../../../shared/domain";
export function SkillForm({
  draft,
  onChange,
  onClose,
  onSave,
  busy,
}: {
  draft: Skill;
  onChange: (draft: Skill) => void;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  busy: string;
}) {
  return (
    <div
      className="agents-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="agents-modal skill-modal" onSubmit={onSave}>
        <div className="agents-modal-head">
          <div>
            <span className="agents-eyebrow">
              <BookOpen size={14} />
              Reusable instruction
            </span>
            <h2>{draft.id ? "Edit skill" : "Add skill"}</h2>
            <p>
              Skills are text instructions. They are never executed as code and
              should be reviewed before use.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => onClose()}
          >
            <X size={19} />
          </button>
        </div>
        <div className="agents-form-scroll">
          <label className="agents-field">
            <span>Name</span>
            <input
              required
              maxLength={120}
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="agents-field">
            <span>Short description</span>
            <input
              maxLength={500}
              value={draft.description || ""}
              onChange={(e) =>
                onChange({
                  ...draft,
                  description: e.target.value,
                })
              }
            />
          </label>
          <label className="agents-field">
            <span>Instructions</span>
            <textarea
              required
              minLength={20}
              maxLength={4000}
              rows={9}
              value={draft.instructions}
              onChange={(e) =>
                onChange({
                  ...draft,
                  instructions: e.target.value,
                })
              }
              placeholder="Describe the reusable task."
            />
            <small>
              The instruction is included as plain text alongside the agent's
              task.
            </small>
          </label>
          {draft.id && (
            <label className="agents-field">
              <span>Review status</span>
              <select
                value={draft.status}
                onChange={(e) => onChange({ ...draft, status: e.target.value })}
              >
                <option value="unreviewed">Needs review</option>
                <option value="active">Reviewed and approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <small>Editing creates a new version.</small>
            </label>
          )}
        </div>
        <div className="agents-modal-actions">
          <button type="button" className="button" onClick={() => onClose()}>
            Cancel
          </button>
          <button className="button primary" disabled={busy === "skill-save"}>
            <Save size={15} />
            {busy === "skill-save" ? "Saving …" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
