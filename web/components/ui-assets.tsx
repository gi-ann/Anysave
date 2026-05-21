"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring as useFramerSpring,
  useTransform,
} from "framer-motion";
import { AtSign } from "lucide-react";

// =======================================================================
// CUSTOM ICONS
// =======================================================================
export const InstagramIcon = ({ size = 16, className = "" }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
  </svg>
);

export const TwitterIcon = ({ size = 16, className = "" }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export const ThreadsIcon = ({ size = 16, className = "" }: any) => (
  <AtSign size={size} className={className} />
);

export const AnimatedSquareArrowOutUpRight = ({
  size = 24,
  className = "",
  strokeWidth = 2,
}: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
      <motion.g
        variants={{ rest: { x: 0, y: 0 }, hover: { x: 2, y: -2 } }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <path d="m21 3-9 9" />
        <path d="M15 3h6v6" />
      </motion.g>
    </svg>
  );
};

export const AnimatedKanban = ({
  size = 22,
  strokeWidth = 2.5,
  className = "",
}: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.path
        d="M6 5v11"
        variants={{
          rest: { d: "M6 5v11" },
          hover: {
            d: ["M6 5v11", "M6 3v15", "M6 5v11"],
            transition: { duration: 1.2, repeat: Infinity, ease: "linear" },
          },
        }}
      />
      <motion.path
        d="M12 5v6"
        variants={{
          rest: { d: "M12 5v6" },
          hover: {
            d: ["M12 5v6", "M12 7v10", "M12 5v6"],
            transition: {
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
              delay: 0.2,
            },
          },
        }}
      />
      <motion.path
        d="M18 5v14"
        variants={{
          rest: { d: "M18 5v14" },
          hover: {
            d: ["M18 5v14", "M18 3v10", "M18 5v14"],
            transition: {
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
              delay: 0.4,
            },
          },
        }}
      />
    </svg>
  );
};

export const AnimatedEllipsis = ({
  size = 22,
  strokeWidth = 2.5,
  className = "",
}: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.circle
        cx="5"
        cy="12"
        r="1.5"
        variants={{ rest: { scale: 1 }, hover: { scale: 1.5 } }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="1.5"
        variants={{ rest: { scale: 1 }, hover: { scale: 1.5 } }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
          delay: 0.05,
        }}
      />
      <motion.circle
        cx="19"
        cy="12"
        r="1.5"
        variants={{ rest: { scale: 1 }, hover: { scale: 1.5 } }}
        transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.1 }}
      />
    </svg>
  );
};

// =======================================================================
// CSS GRADIENT ANIMATION & STYLE STRINGS
// =======================================================================
export const glassSurfaceCss = `
.glass-surface { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: opacity 0.26s ease-out; }
.glass-surface__filter { width: 100%; height: 100%; pointer-events: none; position: absolute; inset: 0; opacity: 0; z-index: -1; }
.glass-surface__content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: inherit; position: relative; z-index: 1; }
.glass-surface--svg { background: hsl(0 0% 0% / var(--glass-frost, 0)); backdrop-filter: var(--filter-id, url(#glass-filter)) saturate(var(--glass-saturation, 1)); box-shadow: 0 0 2px 1px color-mix(in oklch, white, transparent 65%) inset, 0 0 10px 4px color-mix(in oklch, white, transparent 85%) inset, 0px 4px 16px rgba(17, 17, 26, 0.05), 0px 8px 24px rgba(17, 17, 26, 0.05), 0px 16px 56px rgba(17, 17, 26, 0.05), 0px 4px 16px rgba(17, 17, 26, 0.05) inset, 0px 8px 24px rgba(17, 17, 26, 0.05) inset, 0px 16px 56px rgba(17, 17, 26, 0.05) inset; }
.glass-surface--fallback { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px) saturate(1.8) brightness(1.2); -webkit-backdrop-filter: blur(12px) saturate(1.8) brightness(1.2); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2), 0 2px 16px 0 rgba(31, 38, 135, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 0 rgba(255, 255, 255, 0.1); }
@supports not (backdrop-filter: blur(10px)) { .glass-surface--fallback { background: rgba(0, 0, 0, 0.4); } .glass-surface--fallback::before { content: ''; position: absolute; inset: 0; background: rgba(255, 255, 255, 0.05); border-radius: inherit; z-index: -1; } }
.glass-surface:focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }
`;

export const auroraCss = `
@keyframes gradientShift {
    0% { background-position: center top; }
    100% { background-position: center bottom; }
}
.animated-bg {
    width: 100%; height: 100%; position: absolute; inset: 0;
    background: linear-gradient(to bottom, #000000 0%, #000000 40%, #182440 65%, #476192 85%, #e3e3df 100%);
    background-size: 100% 150%; animation: gradientShift 6s ease-in-out infinite alternate;
}
`;

export const gradualBlurCss = `
.gradual-blur { isolation: isolate; pointer-events: none; }
.gradual-blur-inner { position: relative; width: 100%; height: 100%; pointer-events: none; }
.gradual-blur-inner > div { -webkit-backdrop-filter: inherit; backdrop-filter: inherit; pointer-events: none; }
@supports not (backdrop-filter: blur(1px)) {
  .gradual-blur-inner > div { background: rgba(0, 0, 0, 0.3); opacity: 0.5; pointer-events: none; }
}
`;

// =======================================================================
// VISUAL EFFECTS COMPONENTS
// =======================================================================
export const GlowEffect = ({
  colors = ["#0894FF", "#C959DD", "#FF2E54", "#FF9004"],
  duration = 4,
  blur = "medium",
}: any) => {
  const getBlur = () => {
    if (blur === "soft") return "blur(4px)";
    if (blur === "hard") return "blur(20px)";
    return "blur(10px)"; // medium
  };

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none rounded-[inherit] overflow-hidden"
      style={{ filter: getBlur() }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: duration, ease: "linear" }}
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-100"
        style={{
          background: `conic-gradient(from 0deg, ${colors.join(", ")}, ${colors[0]})`,
        }}
      />
    </div>
  );
};

export const Aurora = ({ blend = 1 }: any) => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#000]"
      style={{ opacity: blend }}
    >
      <div className="animated-bg"></div>
      <div
        className="absolute top-0 left-0 w-full h-full content-[''] z-10 pointer-events-none bg-[url('https://www.ui-layouts.com/noise.gif')]"
        style={{ opacity: 0.05 }}
      ></div>
    </div>
  );
};

export const GlassSurface = ({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  className = "",
  style = {},
}: any) => {
  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const [svgSupported, setSvgSupported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const prevSize = useRef({ w: 0, h: 0 });

  const generateDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);
    const svgContent = `<svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect><rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" /><rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" /><rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" /></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [
    borderWidth,
    borderRadius,
    brightness,
    opacity,
    blur,
    mixBlendMode,
    redGradId,
    blueGradId,
  ]);

  const updateDisplacementMap = useCallback(() => {
    feImageRef.current?.setAttribute("href", generateDisplacementMap());
  }, [generateDisplacementMap]);

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute(
          "scale",
          (distortionScale + offset).toString(),
        );
        ref.current.setAttribute("xChannelSelector", xChannel);
        ref.current.setAttribute("yChannelSelector", yChannel);
      }
    });
    gaussianBlurRef.current?.setAttribute("stdDeviation", displace.toString());
  }, [
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
    updateDisplacementMap,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (
        Math.abs(width - prevSize.current.w) > 2 ||
        Math.abs(height - prevSize.current.h) > 2
      ) {
        prevSize.current = { w: width, h: height };
        requestAnimationFrame(() => {
          updateDisplacementMap();
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [updateDisplacementMap]);

  useEffect(() => {
    const supportsSVGFilters = () => {
      if (typeof window === "undefined" || typeof document === "undefined")
        return false;
      if (
        /Safari/.test(navigator.userAgent) &&
        !/Chrome/.test(navigator.userAgent)
      )
        return false;
      if (/Firefox/.test(navigator.userAgent)) return false;
      const div = document.createElement("div");
      div.style.backdropFilter = `url(#${filterId})`;
      return div.style.backdropFilter !== "";
    };
    setSvgSupported(supportsSVGFilters());
  }, [filterId]);

  const containerStyle = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-frost": backgroundOpacity,
    "--glass-saturation": saturation,
    "--filter-id": `url(#${filterId})`,
    outline: "none",
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSupported ? "glass-surface--svg" : "glass-surface--fallback"} ${className}`}
      style={containerStyle}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          >
            <feImage
              ref={feImageRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              ref={redChannelRef}
              in="SourceGraphic"
              in2="map"
              id="redchannel"
              result="dispRed"
            />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap
              ref={greenChannelRef}
              in="SourceGraphic"
              in2="map"
              id="greenchannel"
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap
              ref={blueChannelRef}
              in="SourceGraphic"
              in2="map"
              id="bluechannel"
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur
              ref={gaussianBlurRef}
              in="output"
              stdDeviation="0.7"
            />
          </filter>
        </defs>
      </svg>
      <div className="glass-surface__content">{children}</div>
    </div>
  );
};

const CURVE_FUNCTIONS = {
  linear: (p: number) => p,
  bezier: (p: number) => p * p * (3 - 2 * p),
  "ease-in": (p: number) => p * p,
  "ease-out": (p: number) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p: number) =>
    p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2,
};

export function GradualBlur({
  position = "bottom",
  strength = 2,
  height = "6rem",
  divCount = 5,
  exponential = false,
  zIndex = 10,
  opacity = 1,
  curve = "linear",
  className = "",
  style = {},
}: any) {
  const blurDivs = [];
  const increment = 100 / divCount;
  const curveFunc =
    CURVE_FUNCTIONS[curve as keyof typeof CURVE_FUNCTIONS] ||
    CURVE_FUNCTIONS.linear;

  for (let i = 1; i <= divCount; i++) {
    let progress = i / divCount;
    progress = curveFunc(progress);

    let blurValue;
    if (exponential) {
      blurValue = Math.pow(2, progress * 4) * 0.0625 * strength;
    } else {
      blurValue = 0.0625 * (progress * divCount + 1) * strength;
    }

    const p1 = Math.round((increment * i - increment) * 10) / 10;
    const p2 = Math.round(increment * i * 10) / 10;
    const p3 = Math.round((increment * i + increment) * 10) / 10;
    const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (p3 <= 100) gradient += `, black ${p3}%`;
    if (p4 <= 100) gradient += `, transparent ${p4}%`;

    const direction = position === "top" ? "to top" : "to bottom";

    const divStyle: React.CSSProperties = {
      position: "absolute",
      inset: "0",
      maskImage: `linear-gradient(${direction}, ${gradient})`,
      WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
      backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
      WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
      opacity: opacity,
    };

    blurDivs.push(<div key={i} style={divStyle} />);
  }

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    zIndex,
    height,
    width: "100%",
    left: 0,
    right: 0,
    [position]: 0,
    pointerEvents: "none",
    ...style,
  };

  return (
    <div className={`gradual-blur ${className}`} style={containerStyle}>
      <div className="gradual-blur-inner">{blurDivs}</div>
    </div>
  );
}

export const Magnetic = React.forwardRef<HTMLDivElement, any>(
  (
    {
      children,
      intensity = 0.2,
      range = 100,
      actionArea = "local",
      springOptions = { stiffness: 150, damping: 15, mass: 0.1 },
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useFramerSpring(x, springOptions);
    const springY = useFramerSpring(y, springOptions);

    useEffect(() => {
      if (actionArea !== "global") return;
      const handleMouseMove = (e: MouseEvent) => {
        if (!internalRef.current) return;
        const rect = internalRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
        );
        if (distance < range) {
          x.set((e.clientX - centerX) * intensity);
          y.set((e.clientY - centerY) * intensity);
        } else {
          x.set(0);
          y.set(0);
        }
      };
      const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseout", handleMouseLeave);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseout", handleMouseLeave);
      };
    }, [actionArea, intensity, range, x, y]);

    const handleLocalMouseMove = (e: React.MouseEvent) => {
      if (actionArea !== "local" || !internalRef.current) return;
      const rect = internalRef.current.getBoundingClientRect();
      x.set((e.clientX - (rect.left + rect.width / 2)) * intensity);
      y.set((e.clientY - (rect.top + rect.height / 2)) * intensity);
    };
    const handleLocalMouseLeave = () => {
      if (actionArea !== "local") return;
      x.set(0);
      y.set(0);
    };
    const setRefs = (node: HTMLDivElement) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as any).current = node;
    };

    return (
      <motion.div
        ref={setRefs}
        onMouseMove={handleLocalMouseMove}
        onMouseLeave={handleLocalMouseLeave}
        style={{ x: springX, y: springY }}
      >
        {children}
      </motion.div>
    );
  },
);
Magnetic.displayName = "Magnetic";

export function Tilt({
  children,
  rotationFactor = 8,
  isReverse = false,
  style,
  className,
  springOptions,
}: {
  children: React.ReactNode;
  rotationFactor?: number;
  isReverse?: boolean;
  style?: React.CSSProperties;
  className?: string;
  springOptions?: any;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const config = springOptions || { stiffness: 300, damping: 30 };
  const mouseXSpring = useFramerSpring(x, config);
  const mouseYSpring = useFramerSpring(y, config);
  const scale = useFramerSpring(1, config);

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    isReverse
      ? [`${rotationFactor}deg`, `-${rotationFactor}deg`]
      : [`-${rotationFactor}deg`, `${rotationFactor}deg`],
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    isReverse
      ? [`-${rotationFactor}deg`, `${rotationFactor}deg`]
      : [`${rotationFactor}deg`, `-${rotationFactor}deg`],
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
    scale.set(1.02);
  };
  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
        scale.set(1);
      }}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: "preserve-3d",
        ...style,
      }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
}

// =====================================================================
// COMPONENT PREVIEW (Diabaikan saat disalin ke lokal)
// =====================================================================
export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-8 overflow-hidden relative font-sans">
      <Aurora blend={0.6} />
      <div className="relative z-10 flex flex-col items-center space-y-6">
        <h1 className="text-3xl font-bold text-white tracking-wide" style={{ fontFamily: "'Instrument Serif', serif" }}>
          UI Assets Library Berhasil Dibuat
        </h1>
        <p className="text-zinc-400 text-sm max-w-sm text-center">
          Silakan salin seluruh kode dari file ini ke dalam `components/ui-assets.tsx` lokal milikmu. 
        </p>
        <div className="flex gap-6 pt-4 text-zinc-300">
          <AnimatedKanban size={32} />
          <AnimatedEllipsis size={32} />
          <AnimatedSquareArrowOutUpRight size={32} />
        </div>
      </div>
    </div>
  );
}