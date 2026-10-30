import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode as Content } from "react";
import { useEffect, useRef } from "react";
import { cx } from "../lib/format";

export const IconBox = ({
  icon: Icon,
  color = "green",
  size = "",
}: {
  icon: LucideIcon;
  color?: string;
  size?: string;
}) => (
  <span className={`icon-box ${color} ${size}`}>
    <Icon size={size === "large" ? 25 : 19} strokeWidth={1.7} />
  </span>
);

export function Button({
  children,
  icon: Icon,
  onClick,
  variant = "",
  disabled = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: string;
}) {
  return (
    <button
      className={cx("button", variant, className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: Content;
  hint?: Content;
  children: Content;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label: Content;
  description?: Content;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}

export function Empty({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: Content;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: Content;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,button,textarea,select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = el?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,textarea,select,[tabindex="0"]',
        );
        if (!list?.length) return;
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx("modal", wide && "wide")}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: Content;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

export function Status({ status }: { status: string }) {
  return (
    <span className={cx("status-badge", status)}>
      {status === "running" ? (
        <LoaderCircle size={13} className="spin" />
      ) : status === "completed" ? (
        <CheckCircle2 size={13} />
      ) : status === "failed" ? (
        <AlertCircle size={13} />
      ) : (
        <Circle size={13} />
      )}
      {(
        {
          running: "Running",
          completed: "Completed",
          failed: "Failed",
          skipped: "Skipped",
          cancelled: "Cancelled",
        } as Record<string, string>
      )[status] || status}
    </span>
  );
}

export function Logo() {
  return (
    <span className="logo-mark">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M7 24 15.5 7 24 24M10.5 18h10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25.5" cy="7.5" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}
