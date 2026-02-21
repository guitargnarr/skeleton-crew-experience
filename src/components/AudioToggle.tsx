import { motion } from "framer-motion";

interface AudioToggleProps {
  isPlaying: boolean;
  onToggle: () => void;
  progress: number;
}

export default function AudioToggle({ isPlaying, onToggle, progress }: AudioToggleProps) {
  const opacity = progress < 0.02 ? 0 : progress > 0.92 ? Math.max(0, 1 - (progress - 0.92) / 0.06) : 1;

  return (
    <motion.button
      onClick={onToggle}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed", top: "1.25rem", right: "1.25rem", zIndex: 25,
        width: "2.5rem", height: "2.5rem", borderRadius: "50%",
        border: "1px solid rgba(184, 176, 200, 0.2)",
        background: "rgba(13, 10, 26, 0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        color: isPlaying ? "rgba(0, 229, 255, 0.7)" : "rgba(184, 176, 200, 0.4)",
        transition: "color 0.3s ease, border-color 0.3s ease", pointerEvents: "auto",
      }}
      whileHover={{ scale: 1.1, borderColor: "rgba(0, 229, 255, 0.4)" }}
      whileTap={{ scale: 0.95 }}
      aria-label={isPlaying ? "Mute audio" : "Enable audio"}
    >
      {isPlaying ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </motion.button>
  );
}
