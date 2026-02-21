/**
 * TextOverlay: Scroll-driven text sections -- 5-Scene Architecture
 *
 * Design: Technical Minimalism / Operational Clarity
 * Text appears as terminal output etched into the void.
 * Each section fades in/out based on scroll progress.
 * Typography: JetBrains Mono (display) + Space Grotesk (body)
 * Colors: cream #F5F0E8, electric cyan #00E5FF, lavender-silver #b8b0c8, muted violet #6a5d8a
 *
 * Timeline:
 *   0.00-0.03  Title
 *   0.03-0.18  I.  The Inventory
 *   0.18-0.20  Transition
 *   0.20-0.35  II. The Decision
 *   0.35-0.37  Transition
 *   0.37-0.52  III. The Assembly Line
 *   0.52-0.54  Transition
 *   0.54-0.69  IV. The Verification
 *   0.69-0.71  Transition
 *   0.71-0.86  V.  The Accumulation
 *   0.86-1.00  Outro
 */

/* framer-motion removed from title -- initial opacity:0 can fail silently on mobile.
   Using CSS @keyframes titleFadeUp / titleFade instead (defined in index.css). */

interface TextSectionProps {
  children: React.ReactNode;
  progress: number;
  enterAt: number;
  exitAt: number;
  className?: string;
}

function TextSection({ children, progress, enterAt, exitAt, className = "" }: TextSectionProps) {
  const fadeIn = enterAt;
  const fullIn = enterAt + 0.02;
  const fadeOut = exitAt - 0.02;
  const fullOut = exitAt;

  let opacity = 0;
  let translateY = 24;

  if (progress >= fadeIn && progress < fullIn) {
    const t = (fullIn - fadeIn) > 0 ? (progress - fadeIn) / (fullIn - fadeIn) : 1;
    opacity = Math.max(0.01, t * t);
    translateY = 24 * (1 - t);
  } else if (progress >= fullIn && progress <= fadeOut) {
    opacity = 1;
    translateY = 0;
  } else if (progress > fadeOut && progress <= fullOut) {
    const t = (progress - fadeOut) / (fullOut - fadeOut);
    opacity = 1 - t * t;
    translateY = -16 * t;
  }

  if (opacity < 0.01) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden ${className}`}
      style={{ opacity, transform: `translateY(${translateY}px)`, willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}

/* --- Reusable styled helpers --- */

function Backdrop() {
  return (
    <div
      className="absolute inset-0 -z-10 -m-8"
      style={{ background: "radial-gradient(ellipse at center, rgba(13,10,26,0.65) 0%, transparent 80%)" }}
    />
  );
}

function Divider({ color = "rgba(0, 229, 255, 0.3)" }: { color?: string }) {
  return <div className="mx-auto mt-6" style={{ width: "3rem", height: "1px", background: color }} />;
}

function TransitionLine({ from = "rgba(0, 229, 255, 0.4)", to = "rgba(106, 93, 138, 0.4)" }) {
  return (
    <div className="text-center px-6">
      <div className="mx-auto" style={{ width: "1px", height: "4.5rem", background: `linear-gradient(to bottom, ${from}, ${to})` }} />
    </div>
  );
}

/* --- Main Component --- */

interface TextOverlayProps {
  progress: number;
  isMobile?: boolean;
}

export default function TextOverlay({ progress, isMobile = false }: TextOverlayProps) {
  const headingSize = isMobile ? "clamp(1.8rem, 10vw, 3rem)" : "clamp(2.2rem, 8vw, 5rem)";
  const sectionHeadingSize = isMobile ? "clamp(1.4rem, 7vw, 2.2rem)" : "clamp(1.6rem, 4vw, 2.8rem)";
  const bodySize = isMobile ? "clamp(0.85rem, 3.5vw, 1rem)" : "clamp(0.85rem, 1.5vw, 1rem)";
  const quoteSize = isMobile ? "clamp(0.9rem, 3.8vw, 1.1rem)" : "clamp(0.9rem, 1.5vw, 1.05rem)";
  const outroSize = isMobile ? "clamp(1.4rem, 7vw, 2.2rem)" : "clamp(1.6rem, 4vw, 3rem)";
  const px = isMobile ? "px-6" : "px-8 md:px-16";

  // Shared inline style builders
  const mono = (size: string, weight = 400, color = "#F5F0E8") => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: size,
    fontWeight: weight,
    color,
    textShadow: "0 0 30px rgba(0, 229, 255, 0.15), 0 2px 15px rgba(0,0,0,0.7)",
    lineHeight: 1.2 as number,
  });

  const sans = (size: string, color = "#b8b0c8") => ({
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: size,
    color,
    lineHeight: 1.85 as number,
    maxWidth: "34rem",
    textShadow: "0 1px 8px rgba(0,0,0,0.5)",
    wordBreak: "break-word" as const,
    overflowWrap: "break-word" as const,
  });

  const sceneNumeral = () => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: isMobile ? "0.6rem" : "0.65rem",
    letterSpacing: "0.4em",
    textTransform: "uppercase" as const,
    color: "#00E5FF",
    marginBottom: isMobile ? "1rem" : "1.5rem",
  });

  const sceneTitle = (size: string) => ({
    ...mono(size, 500, "#00E5FF"),
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    textShadow: "0 0 40px rgba(0, 229, 255, 0.25), 0 2px 15px rgba(0,0,0,0.8)",
  });

  const quote = (size: string) => ({
    fontFamily: '"Space Grotesk", sans-serif',
    fontStyle: "italic" as const,
    fontSize: size,
    lineHeight: 1.8,
    color: "#F5F0E8",
    textShadow: "0 0 20px rgba(0, 229, 255, 0.1), 0 1px 10px rgba(0,0,0,0.6)",
    maxWidth: "32rem",
  });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>

      {/* ================================================================= */}
      {/* TITLE                                                             */}
      {/* ================================================================= */}
      <TextSection progress={progress} enterAt={-0.05} exitAt={0.05}>
        <div className="text-center px-6 max-w-3xl">
          <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at center, rgba(13,10,26,0.7) 0%, rgba(13,10,26,0.3) 60%, transparent 100%)" }} />
          <h1
            style={{
              ...mono(headingSize, 500),
              letterSpacing: "0.06em",
              textShadow: "0 0 80px rgba(0, 229, 255, 0.2), 0 2px 20px rgba(0,0,0,0.8)",
              lineHeight: 1.1,
              animation: "titleFadeUp 1.8s ease-out 0.2s both",
            }}
          >
            The Skeleton Crew
          </h1>
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: isMobile ? "clamp(0.5rem, 2.2vw, 0.7rem)" : "clamp(0.6rem, 1.1vw, 0.8rem)",
              fontWeight: 300,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#00E5FF",
              marginTop: isMobile ? "1rem" : "1.5rem",
              textShadow: "0 0 20px rgba(0, 229, 255, 0.3)",
              animation: "titleFade 1.2s ease-out 0.8s both",
            }}
          >
            One Orchestrator. Team-Scale Output.
          </p>
          <div
            className="flex flex-col items-center"
            style={{ marginTop: isMobile ? "2.5rem" : "4rem", animation: "titleFade 1s ease-out 1.5s both" }}
          >
            <svg
              width="16" height={isMobile ? "40" : "56"} viewBox="0 0 16 56" fill="none"
              style={{ animation: "scrollArrowPulse 2.5s ease-in-out infinite" }}
            >
              <line x1="8" y1="0" x2="8" y2="44" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1" />
              <path d="M3 39 L8 48 L13 39" stroke="rgba(0, 229, 255, 0.5)" strokeWidth="1" fill="none" />
            </svg>
            <p style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: isMobile ? "0.5rem" : "0.55rem",
              fontWeight: 300,
              color: "rgba(184, 176, 200, 0.5)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginTop: "0.75rem",
              lineHeight: 1.4,
            }}>
              {isMobile ? "Swipe to begin" : "Scroll to begin"}
            </p>
          </div>
        </div>
      </TextSection>

      {/* ================================================================= */}
      {/* I -- THE INVENTORY                                                */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.03} exitAt={0.09}>
        <div className="text-center px-6 max-w-2xl relative">
          <Backdrop />
          <p style={sceneNumeral()}>I</p>
          <h2 style={sceneTitle(sectionHeadingSize)}>The Inventory</h2>
          <Divider />
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.08} exitAt={0.13}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "left", paddingRight: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Everything starts with knowing what you have. Not guessing. Not assuming. Counting.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.11} exitAt={0.155}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "right", paddingLeft: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Forty-five repositories. Eighty-five models. Dozens of skills. Sixty-nine deployed sites.
            Every tool catalogued, every capability mapped.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.14} exitAt={0.19}>
        <div className="text-center px-6 max-w-lg relative">
          <Backdrop />
          <p style={quote(quoteSize)}>
            "The difference between a hoarder and an arsenal is an index."
          </p>
        </div>
      </TextSection>

      {/* Transition I->II */}
      <TextSection progress={progress} enterAt={0.18} exitAt={0.22}>
        <TransitionLine />
      </TextSection>

      {/* ================================================================= */}
      {/* II -- THE DECISION                                                */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.20} exitAt={0.26}>
        <div className="text-center px-6 max-w-2xl relative">
          <Backdrop />
          <p style={sceneNumeral()}>II</p>
          <h2 style={sceneTitle(sectionHeadingSize)}>The Decision</h2>
          <Divider />
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.25} exitAt={0.30}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "left", paddingRight: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            The craft is not doing everything yourself. The craft is knowing what stays human
            and what gets delegated.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.28} exitAt={0.33}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "right", paddingLeft: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Architecture, client trust, narrative voice -- these require judgment.
            Pipelines, asset generation, data validation -- these require consistency.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.31} exitAt={0.36}>
        <div className="text-center px-6 max-w-lg relative">
          <Backdrop />
          <p style={quote(quoteSize)}>
            "Every delegation is a trust equation. Delegate wrong and you ship noise.
            Refuse to delegate and you ship nothing."
          </p>
        </div>
      </TextSection>

      {/* Transition II->III */}
      <TextSection progress={progress} enterAt={0.35} exitAt={0.39}>
        <TransitionLine from="rgba(106, 93, 138, 0.35)" to="rgba(0, 229, 255, 0.35)" />
      </TextSection>

      {/* ================================================================= */}
      {/* III -- THE ASSEMBLY LINE                                          */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.37} exitAt={0.43}>
        <div className="text-center px-6 max-w-2xl relative">
          <Backdrop />
          <p style={sceneNumeral()}>III</p>
          <h2 style={sceneTitle(sectionHeadingSize)}>The Assembly Line</h2>
          <Divider />
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.42} exitAt={0.47}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "left", paddingRight: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Four streams running simultaneously. Client deliverables compiling while images generate.
            Database queries returning while documents render. Not multitasking -- orchestration.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.45} exitAt={0.50}>
        <div className={`${px} max-w-lg relative`} style={{ textAlign: "right", paddingLeft: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Each stream autonomous. Each result verified before it enters the next.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.48} exitAt={0.53}>
        <div className="text-center px-6 max-w-lg relative">
          <Backdrop />
          <p style={quote(quoteSize)}>
            "A team of twelve shares a board and waits for stand-up.
            A skeleton crew shares a terminal and waits for nothing."
          </p>
        </div>
      </TextSection>

      {/* Transition III->IV */}
      <TextSection progress={progress} enterAt={0.52} exitAt={0.56}>
        <TransitionLine />
      </TextSection>

      {/* ================================================================= */}
      {/* IV -- THE VERIFICATION                                            */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.54} exitAt={0.60}>
        <div className="text-center px-6 max-w-2xl relative">
          <div className="absolute inset-0 -z-10 -m-16" style={{ background: "radial-gradient(ellipse at center, rgba(13,10,26,0.8) 0%, rgba(13,10,26,0.4) 50%, transparent 80%)" }} />
          <p style={{ ...sceneNumeral(), color: "#00E5FF" }}>IV</p>
          <h2 style={{ ...sceneTitle(sectionHeadingSize), textShadow: "0 0 80px rgba(0, 229, 255, 0.35), 0 0 30px rgba(0, 229, 255, 0.2), 0 2px 20px rgba(0,0,0,0.9)" }}>
            The Verification
          </h2>
          <Divider />
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.59} exitAt={0.64}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "left", paddingRight: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Only assert what you directly observed. Not what you expected the code to produce.
            Not what the documentation claims. What you measured, counted, computed, and confirmed.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.62} exitAt={0.67}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "right", paddingLeft: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Forty-one thousand rows means forty-one thousand rows.
            Every number reproducible. Every metric cross-checked.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.65} exitAt={0.70}>
        <div className="text-center px-6 max-w-lg relative">
          <Backdrop />
          <p style={quote(quoteSize)}>
            "Reading source code is not verification. Running the numbers is."
          </p>
        </div>
      </TextSection>

      {/* Transition IV->V */}
      <TextSection progress={progress} enterAt={0.69} exitAt={0.73}>
        <TransitionLine from="rgba(0, 229, 255, 0.35)" to="rgba(106, 93, 138, 0.35)" />
      </TextSection>

      {/* ================================================================= */}
      {/* V -- THE ACCUMULATION                                             */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.71} exitAt={0.77}>
        <div className="text-center px-6 max-w-2xl relative">
          <Backdrop />
          <p style={sceneNumeral()}>V</p>
          <h2 style={sceneTitle(sectionHeadingSize)}>The Accumulation</h2>
          <Divider />
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.76} exitAt={0.81}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "left", paddingRight: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Sixty-nine sites deployed. One LLC filed. Two paying clients.
            A referral pipeline built on proof, not promises.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.79} exitAt={0.84}>
        <div className={`${px} max-w-xl relative`} style={{ textAlign: "right", paddingLeft: "30%" }}>
          <Backdrop />
          <p style={sans(bodySize)}>
            Not a portfolio -- an operating system.
            Not a sprint -- an accumulation of capability that outlasts any single session.
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.82} exitAt={0.87}>
        <div className="text-center px-6 max-w-lg relative">
          <Backdrop />
          <p style={quote(quoteSize)}>
            "The system is the product. The sites are evidence."
          </p>
        </div>
      </TextSection>

      {/* ================================================================= */}
      {/* OUTRO                                                             */}
      {/* ================================================================= */}

      <TextSection progress={progress} enterAt={0.88} exitAt={0.95}>
        <div className="text-center px-6 max-w-2xl relative">
          <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at center, rgba(13,10,26,0.7) 0%, transparent 80%)" }} />
          <p style={{
            ...mono(outroSize, 400),
            textShadow: "0 0 50px rgba(0, 229, 255, 0.15), 0 2px 15px rgba(0,0,0,0.7)",
            lineHeight: 1.3,
          }}>
            The crew was always one.
          </p>
          <p style={{
            ...sans(isMobile ? "clamp(0.85rem, 3.5vw, 1rem)" : "clamp(0.85rem, 1.3vw, 1rem)", "#b8b0c8"),
            marginTop: isMobile ? "1.5rem" : "2rem",
            lineHeight: 1.7,
          }}>
            What looks like an army is one person and a method.
          </p>
          <div className="mx-auto" style={{ width: "1px", height: "3rem", marginTop: isMobile ? "2rem" : "2.5rem", background: "linear-gradient(to bottom, rgba(0, 229, 255, 0.3), transparent)" }} />
          <p style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: isMobile ? "0.55rem" : "0.6rem",
            fontWeight: 300,
            color: "#00E5FF",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginTop: "1rem",
            lineHeight: 1.4,
            textShadow: "0 0 15px rgba(0, 229, 255, 0.2)",
          }}>
            Matthew Scott
          </p>
        </div>
      </TextSection>

      <TextSection progress={progress} enterAt={0.94} exitAt={1.01}>
        <div className="text-center px-6 max-w-lg relative">
          <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at center, rgba(13,10,26,0.6) 0%, transparent 80%)" }} />
          <div className="mx-auto mb-8" style={{ width: "2rem", height: "1px", background: "rgba(106, 93, 138, 0.25)" }} />
          <p style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: isMobile ? "clamp(0.5rem, 2.2vw, 0.65rem)" : "clamp(0.55rem, 0.9vw, 0.65rem)",
            fontWeight: 300,
            color: "rgba(184, 176, 200, 0.5)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            lineHeight: 1.8,
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
          }}>
            Project Lavos, 2026
          </p>
        </div>
      </TextSection>

      {/* ================================================================= */}
      {/* SCROLL GUIDE -- persistent arrow + scene indicator                */}
      {/* ================================================================= */}
      {(() => {
        const sceneStarts = [0.03, 0.20, 0.37, 0.54, 0.71];
        const sceneEnds = [0.18, 0.35, 0.52, 0.69, 0.86];
        const labels = ["I", "II", "III", "IV", "V"];
        let currentScene = -1;
        for (let i = 0; i < 5; i++) {
          if (progress >= sceneStarts[i] && progress <= sceneEnds[i]) { currentScene = i; break; }
        }
        // During transitions or outro, find the nearest scene
        if (currentScene === -1) {
          for (let i = 0; i < 5; i++) {
            if (progress < sceneStarts[i]) { currentScene = i; break; }
          }
          if (currentScene === -1) currentScene = 4;
        }
        const isOutro = progress > 0.86;
        const guideOpacity = isOutro ? Math.max(0, 1 - (progress - 0.86) / 0.08) : Math.min(1, progress / 0.02);
        // SVG progress ring
        const circumference = 2 * Math.PI * 16;
        const strokeOffset = circumference * (1 - Math.min(progress / 0.86, 1));

        return (
          <div
            className="fixed left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{
              zIndex: 20,
              bottom: isMobile ? "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))" : "1.5rem",
              opacity: guideOpacity,
              transition: "opacity 0.5s ease",
            }}
          >
            {/* Scene numeral + progress ring */}
            <div style={{ position: "relative", width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                {/* Track */}
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(106, 93, 138, 0.15)" strokeWidth="1" />
                {/* Progress arc */}
                <circle
                  cx="20" cy="20" r="16" fill="none"
                  stroke="rgba(0, 229, 255, 0.5)"
                  strokeWidth="1"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
                />
              </svg>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.65rem",
                fontWeight: 400,
                color: "rgba(0, 229, 255, 0.7)",
                letterSpacing: "0.05em",
                transition: "color 0.4s ease",
              }}>
                {labels[currentScene]}
              </span>
            </div>

            {/* Subtle scroll arrow -- pulses gently, hidden near end */}
            {progress < 0.84 && (
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(184, 176, 200, 0.3)"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginTop: "0.25rem", animation: "scrollArrowPulse 2.5s ease-in-out infinite" }}
              >
                <path d="M7 13l5 5 5-5" />
              </svg>
            )}
          </div>
        );
      })()}
    </div>
  );
}
