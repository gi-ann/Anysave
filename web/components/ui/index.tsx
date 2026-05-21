import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, LoaderCircle, Plus, ArrowLeft } from "lucide-react";

export function AnimateIcon({
  children,
  className = "",
  action = "scale",
  animateOnHover = false,
}: any) {
  const variants: any = {
    scale: {
      rest: { scale: 1 },
      hover: {
        scale: 1.15,
        transition: { type: "spring", stiffness: 400, damping: 10 },
      },
    },
    rotate: {
      rest: { rotate: 0 },
      hover: {
        rotate: 90,
        transition: { type: "spring", stiffness: 200, damping: 15 },
      },
    },
    "rotate-reverse": {
      rest: { rotate: 0 },
      hover: { rotate: -360, transition: { duration: 0.5, ease: "easeOut" } },
    },
    shake: {
      rest: { rotate: 0, x: 0 },
      hover: { rotate: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } },
    },
    lift: {
      rest: { y: 0, scale: 1 },
      hover: {
        y: -3,
        scale: 1.1,
        transition: { type: "spring", stiffness: 400, damping: 10 },
      },
    },
    pulse: {
      rest: { scale: 1 },
      hover: {
        scale: [1, 1.1, 1],
        transition: { repeat: Infinity, duration: 1 },
      },
    },
    jump: {
      rest: { y: 0 },
      hover: { y: [0, -5, 0], transition: { duration: 0.4, ease: "easeOut" } },
    },
  };
  const content = (
    <motion.div
      variants={variants[action]}
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {children}
    </motion.div>
  );
  return animateOnHover ? (
    <motion.div
      initial="rest"
      whileHover="hover"
      className={`inline-flex ${className}`}
    >
      {content}
    </motion.div>
  ) : (
    content
  );
}

export interface ButtonCopyProps {
  className?: string;
  disabled?: boolean;
  duration?: number;
  onCopy?: () => Promise<void> | void;
}
export function ButtonCopy({
  onCopy,
  className = "",
  duration = 2000,
  disabled = false,
}: ButtonCopyProps) {
  const [buttonState, setButtonState] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setButtonState("loading");
      if (onCopy) await onCopy();
      setTimeout(() => setButtonState("success"), 1000);
      setTimeout(() => setButtonState("idle"), 1000 + duration);
    },
    [onCopy, duration],
  );

  const icons = {
    idle: (
      <Copy size={16} className="transition-transform group-hover:scale-110" />
    ),
    loading: <LoaderCircle className="animate-spin" size={16} />,
    success: (
      <Check size={16} className="transition-transform group-hover:scale-110" />
    ),
  };
  return (
    <div className="flex justify-center">
      <motion.button
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.9 }}
        className={`relative flex items-center justify-center cursor-pointer overflow-hidden outline-none group ${className}`}
        disabled={buttonState !== "idle" || disabled}
        onClick={handleClick}
        type="button"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 25, filter: "blur(10px)" }}
            initial={{ opacity: 0, y: -25, filter: "blur(10px)" }}
            key={buttonState}
            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
            className="flex w-full items-center justify-center"
          >
            {icons[buttonState]}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export const CircularCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${checked ? "bg-white border-white scale-110" : "border-zinc-500 hover:border-zinc-300 bg-transparent"}`}
  />
);

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  dotColorClass,
  align = "right",
  direction = "down",
  onAdd,
  addLabel,
  triggerClassName = "",
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.label === value);
  const activeDotColor = selectedOption?.colorClass || dotColorClass;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOption.trim()) {
      if (onAdd) onAdd(newOption.trim());
      onChange(newOption.trim());
      setNewOption("");
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={ref}>
      <motion.div
        initial="rest"
        whileHover="hover"
        animate={isOpen ? "hover" : "rest"}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors select-none ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0 -ml-1 scale-[0.8] origin-center">
            <motion.div
              variants={{
                rest: { width: 8, height: 8, borderRadius: "999px" },
                hover: { width: 8, height: 20, borderRadius: "999px" },
              }}
              className={`absolute ${activeDotColor}`}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          </div>
          <span
            className={`text-xs font-semibold transition-colors truncate text-white`}
          >
            {value || placeholder}
          </span>
        </div>
      </motion.div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: direction === "up" ? 5 : -5,
              scale: 0.95,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "up" ? 5 : -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} w-52 p-1.5 bg-[#1c1c1e] rounded-xl shadow-2xl z-50 ring-1 ring-white/10`}
          >
            <div className="max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
              {options.length > 0 ? (
                options.map((opt: any, index: number) => (
                  <div
                    key={`${opt.label}-${index}`}
                    onClick={() => {
                      onChange(opt.label);
                      setIsOpen(false);
                      setIsAdding(false);
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors select-none"
                  >
                    <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0 scale-[0.7] origin-center -ml-1">
                      <motion.div
                        variants={{
                          rest: { width: 8, height: 8, borderRadius: "999px" },
                          hover: {
                            width: 8,
                            height: 20,
                            borderRadius: "999px",
                          },
                        }}
                        className={`absolute ${opt.colorClass || dotColorClass}`}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      />
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-xs text-white text-center">
                  Belum ada data
                </div>
              )}
              {onAdd && (
                <>
                  <div className="-mx-1 my-1 h-px bg-zinc-800/60" />
                  {!isAdding ? (
                    <motion.div
                      initial="rest"
                      whileHover="hover"
                      onClick={(e: any) => {
                        e.stopPropagation();
                        setIsAdding(true);
                      }}
                      className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors select-none"
                    >
                      <Plus
                        size={14}
                        className="-ml-1 transition-transform group-hover:scale-110"
                      />
                      <span className="truncate">{addLabel}</span>
                    </motion.div>
                  ) : (
                    <form
                      onSubmit={handleAddSubmit}
                      className="flex flex-col mx-1 my-1 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800"
                    >
                      <div className="p-2 pb-1">
                        <input
                          autoFocus
                          type="text"
                          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-400 font-sans"
                          placeholder={addLabel}
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2 mt-1 border-t border-zinc-800/80 bg-zinc-900/50">
                        <motion.button
                          initial="rest"
                          whileHover="hover"
                          type="button"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            setIsAdding(false);
                          }}
                          className="text-white hover:bg-zinc-800 p-1 rounded transition-colors cursor-pointer outline-none"
                        >
                          <ArrowLeft
                            size={12}
                            className="transition-transform group-hover:scale-110"
                          />
                        </motion.button>
                        <button
                          type="submit"
                          className="text-[10px] font-bold text-zinc-900 bg-white hover:bg-zinc-300 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Komponen Magic UI: Animated Gradient Text
export function AnimatedGradientText({
  children,
  className = "",
  speed = 1,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  ...props
}: any) {
  return (
    <span
      style={{
        "--bg-size": `${speed * 300}%`,
        "--color-from": colorFrom,
        "--color-to": colorTo,
      } as React.CSSProperties}
      className={`animate-gradient inline-block bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}