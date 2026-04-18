import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function TopBar() {
  const { t } = useTranslation();
  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("ttb.lang", lng);
  };
  return (
    <header className="glass relative flex h-12 items-center justify-between border-b border-white/5 px-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
        <span className="uppercase tracking-[0.18em] text-zinc-400">{t("app.tagline")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">{t("common.language")}:</span>
        <button
          onClick={() => change("it")}
          className={`rounded px-1.5 py-0.5 transition ${i18n.language === "it" ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          IT
        </button>
        <span className="text-zinc-700">/</span>
        <button
          onClick={() => change("en")}
          className={`rounded px-1.5 py-0.5 transition ${i18n.language === "en" ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/40" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          EN
        </button>
      </div>
    </header>
  );
}
