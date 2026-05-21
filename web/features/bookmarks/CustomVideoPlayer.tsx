"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassSurface, Magnetic, AnimatedEllipsis } from "@/components/ui-assets";
import { Play, Pause, Volume2, VolumeX, Download, ArrowLeft } from "lucide-react";

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  crossOrigin?: string;
  onLoadedData?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  children?: React.ReactNode; // For overlay elements like "Open Original" button
}

export default function CustomVideoPlayer({
  src,
  poster,
  className = "",
  autoPlay = true,
  loop = true,
  muted = true,
  crossOrigin,
  onLoadedData,
  onError,
  children,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isProgressHover, setIsProgressHover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(muted);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AMBIENT MODE (CINEMATIC LIGHTING) ---
  useEffect(() => {
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const drawAmbient = () => {
      if (!video.paused && !video.ended) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          // Abaikan error tainted canvas
        }
      }
      animationFrameId = requestAnimationFrame(drawAmbient);
    };

    const handlePlay = () => {
      animationFrameId = requestAnimationFrame(drawAmbient);
    };

    const handlePause = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
    
    const handleLoadedData = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (e) {}
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadeddata", handleLoadedData);

    if (!video.paused) handlePlay();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [src]);

  const getDisplayedTime = () => {
    if (showRemaining) {
      const remaining = duration - currentTime;
      return `-${formatTime(remaining >= 0 ? remaining : 0)}`;
    }
    return formatTime(duration);
  };

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isHovering && !isDragging) setShowControls(false);
    }, 3000);
  }, [isHovering, isDragging]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [src]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetHideTimer();
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
    resetHideTimer();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = pct * video.duration;
    setProgress(pct * 100);
    resetHideTimer();
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const bar = progressBarRef.current;
      const video = videoRef.current;
      if (!bar || !video) return;

      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      video.currentTime = pct * video.duration;
      setProgress(pct * 100);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center group/player ${className}`}
      onMouseEnter={() => { setIsHovering(true); setShowControls(true); }}
      onMouseLeave={() => { setIsHovering(false); resetHideTimer(); }}
      onMouseMove={resetHideTimer}
    >
      {/* AMBIENT CANVAS (Cinematic Lighting) */}
      <canvas
        ref={ambientCanvasRef}
        width={32}
        height={32}
        style={{ maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)" }}
        className="absolute inset-[-50%] w-[200%] h-[200%] object-cover blur-[120px] saturate-150 opacity-40 pointer-events-none -z-10"
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        muted={muted}
        loop={loop}
        preload="auto"
        crossOrigin={crossOrigin as any}
        className="max-w-full max-h-[80vh] w-auto h-auto outline-none relative z-10"
        onLoadedData={(e) => {
          if (autoPlay) e.currentTarget.play();
          onLoadedData?.(e);
        }}
        onError={onError}
        onClick={togglePlayPause}
      />

      {/* Overlay children (e.g. "Open Original" button) */}
      {children}

      {/* Custom Controls Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-5 left-5 right-5 flex flex-col gap-3 pointer-events-auto z-40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top row: Buttons (Play, Menu, Time) grouped closely on the left */}
            <div className="flex items-center gap-3 w-full">
              {/* Play Button */}
              <Magnetic intensity={0.15} actionArea="global" range={120} springOptions={{ bounce: 0.1 }}>
                <div onClick={togglePlayPause} className="cursor-pointer flex-shrink-0">
                  <GlassSurface
                    width={40}
                    height={40}
                    borderRadius={20}
                    blur={10}
                    displace={0.8}
                    redOffset={-8}
                    className="shadow-2xl"
                  >
                    <Magnetic intensity={0.1} actionArea="global" range={120} springOptions={{ bounce: 0.1 }}>
                      <div className="flex items-center justify-center w-full h-full pointer-events-none text-white">
                        <AnimatePresence mode="wait">
                          {isPlaying ? (
                            <motion.div
                              key="pause"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Pause size={18} strokeWidth={2.5} fill="white" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="play"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Play size={18} strokeWidth={2.5} fill="white" className="ml-0.5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Magnetic>
                  </GlassSurface>
                </div>
              </Magnetic>

              {/* Ellipsis Menu (Mute & Download) */}
              <Magnetic intensity={0.15} actionArea="global" range={100} springOptions={{ bounce: 0.1 }}>
                <AnimatePresence mode="wait">
                  {!menuOpen ? (
                    <motion.button
                      key="menu-dot"
                      layoutId="video-menu-morph"
                      initial="rest"
                      whileHover="hover"
                      whileTap={{ scale: 0.95 }}
                      className="cursor-pointer flex-shrink-0 outline-none focus:outline-none focus:ring-0 rounded-full group"
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
                    >
                      <GlassSurface
                        width={40}
                        height={40}
                        borderRadius={20}
                        blur={10}
                        displace={0.8}
                        redOffset={-8}
                        className="shadow-2xl outline-none focus:outline-none focus:ring-0"
                      >
                        <Magnetic intensity={0.1} actionArea="global" range={100} springOptions={{ bounce: 0.1 }}>
                          <div className="flex items-center justify-center w-full h-full relative z-10 text-zinc-300 hover:text-white transition-colors">
                            <AnimatedEllipsis size={20} strokeWidth={2.5} />
                          </div>
                        </Magnetic>
                      </GlassSurface>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="menu-expanded"
                      layoutId="video-menu-morph"
                      className="flex-shrink-0 outline-none"
                    >
                      <GlassSurface
                        width={128}
                        height={40}
                        borderRadius={20}
                        blur={10}
                        displace={0.8}
                        redOffset={-8}
                        className="shadow-2xl outline-none focus:outline-none focus:ring-0"
                      >
                        <div className="flex relative z-10 w-full px-2 items-center justify-between h-full text-zinc-400">
                          <motion.button
                            initial="rest"
                            whileHover="hover"
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:text-white transition-colors outline-none focus:outline-none focus:ring-0 cursor-pointer"
                          >
                            <motion.div animate={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                              <AnimatedEllipsis size={18} strokeWidth={2.5} />
                            </motion.div>
                          </motion.button>

                          <button
                            onClick={toggleMute}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:text-white transition-colors outline-none focus:outline-none focus:ring-0 cursor-pointer"
                            title={isMuted ? "Nyalakan Suara" : "Bisukan"}
                          >
                            <AnimatePresence mode="wait">
                              {isMuted ? (
                                <motion.div key="muted" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                                  <VolumeX size={16} strokeWidth={2.5} />
                                </motion.div>
                              ) : (
                                <motion.div key="unmuted" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                                  <Volume2 size={16} strokeWidth={2.5} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>

                          <button
                            onClick={handleDownload}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:text-white transition-colors outline-none focus:outline-none focus:ring-0 cursor-pointer"
                            title="Download Video"
                          >
                            <Download size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </GlassSurface>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Magnetic>

              {/* Time Display Button */}
              <Magnetic intensity={0.15} actionArea="global" range={100} springOptions={{ bounce: 0.1 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRemaining(!showRemaining); }}
                  className="cursor-pointer flex-shrink-0 outline-none focus:outline-none focus:ring-0 rounded-full group"
                >
                  <GlassSurface
                    width={80}
                    height={40}
                    borderRadius={20}
                    blur={10}
                    displace={0.8}
                    redOffset={-8}
                    className="shadow-2xl"
                  >
                    <div className="flex items-center justify-center w-full h-full text-white/90 font-medium tabular-nums text-[12px] select-none" style={{ fontFamily: "'FixelTextCustom', sans-serif" }}>
                      {getDisplayedTime()}
                    </div>
                  </GlassSurface>
                </button>
              </Magnetic>
            </div>

            {/* Bottom row: Progress Bar */}
            <div className="w-full px-1">
              <div
                ref={progressBarRef}
                className="relative w-full h-6 flex items-center cursor-pointer group/bar"
                onMouseDown={handleDragStart}
                onMouseEnter={() => setIsProgressHover(true)}
                onMouseLeave={() => setIsProgressHover(false)}
              >
                {/* Track Background */}
                <div className="w-full relative rounded-full overflow-hidden transition-all duration-200"
                  style={{ height: isProgressHover || isDragging ? "6px" : "3px" }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full" />

                  {/* Filled Progress */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full transition-[width] duration-75"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.95))",
                    }}
                  />
                </div>

                {/* Seek Thumb (visible on hover) */}
                <AnimatePresence>
                  {(isProgressHover || isDragging) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${progress}%`, marginLeft: "-6px" }}
                    >
                      <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-black/30" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
