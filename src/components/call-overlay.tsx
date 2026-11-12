"use client";

import { AnimatePresence, motion } from "motion/react";
import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const prefer = ["Samantha", "Ava", "Google US English", "Microsoft Aria", "Allison", "Karen"];
  for (const name of prefer) {
    const v = voices.find((x) => x.name.includes(name) && x.lang.startsWith("en"));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en-US")) ?? voices[0];
}

// A phone call from Cleared that reads the verdict aloud with captions. The
// buyer is standing in a driveway holding the item, not reading a screen.
export function CallOverlay({ open, script, caller = "Cleared", onClose }: { open: boolean; script: string; caller?: string; onClose: () => void }) {
  // Mounting the screen only while open means every call starts fresh.
  return <AnimatePresence>{open && <CallScreen key="call" script={script} caller={caller} onClose={onClose} />}</AnimatePresence>;
}

function CallScreen({ script, caller, onClose }: { script: string; caller: string; onClose: () => void }) {
  const [phase, setPhase] = useState<"ringing" | "live" | "ended">("ringing");
  const [word, setWord] = useState(-1);
  const [seconds, setSeconds] = useState(0);
  const words = script.split(/\s+/);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const answer = () => {
    setPhase("live");
    const synth = window.speechSynthesis;
    // Caption fallback for browsers without word-boundary events.
    let i = 0;
    let boundaries = false;
    timer.current = setInterval(() => {
      if (boundaries) return;
      setWord(i++);
      if (i > words.length) clearInterval(timer.current!);
    }, 300);
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(script);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    const charToWord: number[] = [];
    let pos = 0;
    words.forEach((w, idx) => {
      for (let k = 0; k <= w.length; k++) charToWord[pos + k] = idx;
      pos += w.length + 1;
    });
    u.onboundary = (e) => {
      if (e.name !== "word") return;
      boundaries = true;
      setWord(charToWord[e.charIndex] ?? 0);
    };
    u.onend = () => {
      setWord(words.length);
      setTimeout(() => setPhase("ended"), 900);
    };
    synth.speak(u);
  };

  const hangup = () => {
    window.speechSynthesis?.cancel();
    if (timer.current) clearInterval(timer.current);
    onClose();
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col bg-[#2b2b2e] text-white"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%", transition: { duration: 0.3 } }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <div className="flex flex-1 flex-col items-center px-7 pt-[72px]">
        <div className="grid size-[78px] place-items-center rounded-full bg-[#8e8e93] text-[32px] font-medium">C</div>
        <h3 className="mt-3 text-[30px] font-normal">{caller}</h3>
        <p className="mt-0.5 text-[15px] text-white/60">
          {phase === "ringing" ? "Recall alert · calling…" : phase === "live" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Call ended"}
        </p>

        {phase !== "ringing" && (
          <p className="mt-10 text-center text-[19px] leading-snug">
            {words.map((w, i) => (
              <span key={i} className={i <= word ? "text-white" : "text-white/30"}>
                {w}{" "}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex items-center justify-around px-12 pb-16">
        {phase === "ringing" ? (
          <>
            <CallButton color="#ff3b30" label="Decline" onClick={hangup}>
              <PhoneOff className="size-7" />
            </CallButton>
            <CallButton color="#34c759" label="Accept" onClick={answer}>
              <Phone className="size-7" />
            </CallButton>
          </>
        ) : (
          <CallButton color="#ff3b30" label={phase === "ended" ? "Close" : "End"} onClick={hangup}>
            <PhoneOff className="size-7" />
          </CallButton>
        )}
      </div>
    </motion.div>
  );
}

function CallButton({ color, label, onClick, children }: { color: string; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 text-[13px] text-white">
      <span className="grid size-[72px] place-items-center rounded-full active:opacity-70" style={{ background: color }}>
        {children}
      </span>
      {label}
    </button>
  );
}
