"use client";

import clsx from "clsx";
import { createContext, useContext, useEffect, useState } from "react";

// Lets the app inside a frame flip the status bar between dark and light text.
const StatusBarContext = createContext<(tone: "light" | "dark") => void>(() => {});
export const useStatusBar = (tone: "light" | "dark") => {
  const set = useContext(StatusBarContext);
  useEffect(() => set(tone), [set, tone]);
};

function Clock() {
  const [now, setNow] = useState("9:41");
  useEffect(() => {
    const f = () => setNow(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, ""));
    f();
    const t = setInterval(f, 15_000);
    return () => clearInterval(t);
  }, []);
  return <span>{now}</span>;
}

// A plain device frame. On small screens (fullOnMobile) the app fills the viewport instead.
export function PhoneFrame({ children, className, label, fullOnMobile, highlight }: { children: React.ReactNode; className?: string; label?: React.ReactNode; fullOnMobile?: boolean; highlight?: boolean }) {
  const m = (c: string) => (fullOnMobile ? c : "");
  const [bar, setBar] = useState<"light" | "dark">("light");
  return (
    <div className={clsx("relative", className)}>
      {label && <div className="mb-3 max-md:hidden">{label}</div>}
      <div className={clsx("relative rounded-[50px] bg-[#1b1b1b] p-[10px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] outline-offset-[6px] transition-[outline-color] duration-300", highlight ? "outline-[5px] outline-yellow outline" : "outline-transparent", m("max-md:rounded-none max-md:p-0 max-md:shadow-none"))}>
        <div className={clsx("ios relative isolate h-[740px] w-[360px] overflow-hidden rounded-[41px] bg-ios-bg text-black", m("max-md:h-dvh max-md:w-screen max-md:rounded-none"))}>
          <div
            className={clsx(
              m("max-md:hidden"),
              "pointer-events-none absolute inset-x-0 top-0 z-40 flex h-12 items-center justify-between px-8 pt-1 text-[15px] font-semibold transition-colors duration-300",
              bar === "light" ? "text-black" : "text-white",
            )}
          >
            <Clock />
            <span className="flex items-center gap-1.5">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.4" /><rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" /><rect x="23" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4" /></svg>
            </span>
          </div>
          <div className={clsx(m("max-md:hidden"), "absolute left-1/2 top-2.5 z-50 h-[30px] w-[106px] -translate-x-1/2 rounded-full bg-black")} />
          <div className="absolute inset-0 overflow-y-auto scrollbar-none">
            <StatusBarContext.Provider value={setBar}>{children}</StatusBarContext.Provider>
          </div>
          <div className={clsx(m("max-md:hidden"), "pointer-events-none absolute bottom-2 left-1/2 z-50 h-[5px] w-[128px] -translate-x-1/2 rounded-full", bar === "light" ? "bg-black" : "bg-white")} />
        </div>
      </div>
    </div>
  );
}
