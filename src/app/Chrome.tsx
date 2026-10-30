import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  Menu,
  Network,
  Search,
  Settings2,
} from "lucide-react";
import type { Bootstrap } from "../../shared/domain";
import { Logo } from "../components/ui";
import { cx } from "../lib/format";
import type { Go } from "../lib/props";
import { nav, type View } from "./definitions";
type Props = {
  data: Bootstrap;
  mobileNav: boolean;
  setMobileNav: (v: boolean) => void;
  view: View;
  go: Go;
  connected: boolean;
  setModal: (value: { type: string }) => void;
};
export function Sidebar({
  data,
  mobileNav,
  view,
  go,
  connected,
  setModal,
}: Props) {
  return (
    <aside className={cx("sidebar", mobileNav && "mobile-open")}>
      <a
        className="brand"
        aria-label="AgentFlux overview"
        href="#overview"
        onClick={() => go("overview")}
      >
        <Logo />
        <span>
          AgentFlux<span className="brand-dot">.</span>
        </span>
      </a>
      <div className="workspace-switch">
        <span className="workspace-avatar">A</span>
        <span>
          <strong>My AgentFlux</strong>
          <small>Local instance</small>
        </span>
        <ChevronDown size={15} />
      </div>
      <div className="nav-caption">PLATFORM</div>
      <nav>
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-label={label}
            title={label}
            className={cx("nav-item", view === id && "active")}
            onClick={() => go(id)}
          >
            <Icon size={19} strokeWidth={1.7} />
            <span>{label}</span>
            {id === "studio" && (
              <span className="nav-count">{data.workflows.length}</span>
            )}
            {view === id && <span className="nav-active-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <div className="orbit-symbol">
          <Network size={29} strokeWidth={1.1} />
        </div>
        <strong>
          Files, APIs and
          <br />
          local programs
        </strong>
        <p>Data sources for your workflows.</p>
        <button onClick={() => go("connectors")}>
          Add connection <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="sidebar-bottom">
        <button
          aria-label="Settings"
          title="Settings"
          className={cx("nav-item", view === "settings" && "active")}
          onClick={() => go("settings")}
        >
          <Settings2 size={18} />
          Settings
        </button>
        <button
          className="nav-item"
          aria-label="Quick start"
          title="Quick start"
          onClick={() => setModal({ type: "help" })}
        >
          <CircleHelp size={18} />
          Quick start
        </button>
        <div className="local-status">
          <span className="status-dot" />
          <span>
            {connected ? "Connected locally" : "Connection lost"}
            <small>AgentFlux · v0.3.0</small>
          </span>
          <LockKeyhole size={14} />
        </div>
      </div>
    </aside>
  );
}
export function Topbar({
  mobileNav,
  setMobileNav,
  view,
  setModal,
}: Pick<Props, "mobileNav" | "setMobileNav" | "view" | "setModal">) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          onClick={() => setMobileNav(!mobileNav)}
          aria-label="Navigation"
        >
          <Menu size={20} />
        </button>
        <span>AgentFlux</span>
        <ChevronRight size={14} />
        <strong>
          {view === "settings"
            ? "Settings"
            : nav.find((n) => n.id === view)?.label || "Overview"}
        </strong>
      </div>
      <div className="topbar-right">
        <button
          className="search-trigger"
          aria-label="Search"
          onClick={() => setModal({ type: "search" })}
        >
          <Search size={15} />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        <span className="local-pill">
          <span className="status-dot" />
          Self-hosted
        </span>
        <span className="user-avatar">YOU</span>
      </div>
    </header>
  );
}
