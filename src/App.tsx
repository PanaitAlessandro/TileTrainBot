import { lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { useUI } from "./store";

const TileEditor = lazy(() => import("./pages/TileEditor"));
const Simulator = lazy(() => import("./pages/Simulator"));
const Trainer = lazy(() => import("./pages/Trainer"));
const Exporter = lazy(() => import("./pages/Exporter"));
const Analytics = lazy(() => import("./pages/Analytics"));

function Loading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-400">
      <span className="h-2 w-2 animate-ping rounded-full bg-brand-500" />
      <span className="tracking-widest">LOADING</span>
    </div>
  );
}

export default function App() {
  const section = useUI((s) => s.section);
  return (
    <div className="tech-grid relative flex h-full w-full">
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<Loading />}>
            {section === "editor" && <TileEditor />}
            {section === "sim" && <Simulator />}
            {section === "trainer" && <Trainer />}
            {section === "exporter" && <Exporter />}
            {section === "analytics" && <Analytics />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
