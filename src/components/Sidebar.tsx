import { useTranslation } from "react-i18next";
import { Grid3x3, Play, Brain, Package, BarChart3 } from "lucide-react";
import clsx from "clsx";
import { useUI, type Section } from "../store";

const items: { id: Section; icon: React.ComponentType<{ size?: number; className?: string }>; key: string }[] = [
  { id: "editor", icon: Grid3x3, key: "nav.editor" },
  { id: "sim", icon: Play, key: "nav.sim" },
  { id: "trainer", icon: Brain, key: "nav.trainer" },
  { id: "exporter", icon: Package, key: "nav.exporter" },
  { id: "analytics", icon: BarChart3, key: "nav.analytics" },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { section, setSection } = useUI();
  return (
    <aside className="glass relative z-10 flex w-56 flex-col border-r border-white/5">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative">
          <img
            src="/logo.png"
            alt="TileTrainBot"
            className="relative h-9 w-9 rounded-lg bg-white object-contain p-0.5 ring-1 ring-brand-500/50"
          />
          <span className="absolute inset-0 -z-10 rounded-lg bg-brand-500/30 blur-md" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-gradient">
            {t("app.title")}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">v0.1.0</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {items.map(({ id, icon: Icon, key }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={clsx(
                "group relative flex items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm transition",
                active
                  ? "bg-gradient-to-r from-brand-600/35 via-brand-500/20 to-transparent text-white shine active-glow"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-gradient-to-b from-brand-400 to-accent-400 shadow-[0_0_12px_rgba(91,124,250,0.9)]" />
              )}
              <Icon size={16} className={clsx(active ? "text-brand-400" : "opacity-80 group-hover:opacity-100")} />
              <span className="tracking-wide">{t(key)}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        MIT · open source
      </div>
    </aside>
  );
}
