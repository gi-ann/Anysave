"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Aurora,
  GlassSurface,
  AnimatedKanban,
  Magnetic,
} from "@/components/ui-assets";

const SIDEBAR_WIDTH = "32rem";

const SidebarContext = createContext<{
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (openMobile: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, any>(
  (
    {
      defaultOpen = false,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const [openMobile, setOpenMobile] = useState(false);
    const [_open, _setOpen] = useState(defaultOpen);

    const open = openProp ?? _open;
    const setOpen = useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) setOpenProp(openState);
        else _setOpen(openState);
      },
      [setOpenProp, open],
    );

    const toggleSidebar = useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const state = open ? "expanded" : "collapsed";
    const contextValue = React.useMemo(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      ],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              ...style,
            } as React.CSSProperties
          }
          className={`group/sidebar-wrapper flex min-h-svh w-full bg-transparent text-zinc-50 overflow-hidden ${className || ""}`}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

export const Sidebar = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (isMobile) {
      return (
        <AnimatePresence>
          {openMobile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenMobile(false)}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`fixed inset-y-0 left-0 z-[110] w-[var(--sidebar-width)] shadow-2xl flex flex-col overflow-hidden ${className || ""}`}
                ref={ref}
                {...props}
              >
                <Aurora blend={1} />
                <div className="relative z-10 flex flex-col h-full w-full">
                  {children}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      );
    }

    return (
      <div
        ref={ref}
        data-state={state}
        className={`group peer hidden md:block flex-shrink-0 transition-[width] duration-300 ease-in-out ${state === "expanded" ? "w-[32rem]" : "w-0"} ${className || ""}`}
        {...props}
      >
        <div
          className={`fixed inset-y-0 left-0 z-30 h-svh w-[32rem] flex flex-col transition-transform duration-300 ease-in-out overflow-hidden ${state === "expanded" ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Aurora blend={1} />
          <div className="relative z-10 flex flex-col h-full w-full">
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, any>(
  ({ className, onClick, children, ...props }, ref) => {
    const { toggleSidebar, open } = useSidebar();
    return (
      <motion.button
        ref={ref as any}
        onClick={(e: any) => {
          onClick?.(e);
          toggleSidebar();
        }}
        className={`relative flex outline-none cursor-pointer rounded-full group focus:outline-none focus:ring-0 ${className || ""}`}
        whileTap={{ scale: 0.9 }}
        {...props}
      >
        <GlassSurface
          width={48}
          height={48}
          borderRadius={24}
          blur={10}
          displace={0.8}
          redOffset={-8}
          className="shadow-2xl outline-none focus:outline-none focus:ring-0"
        >
          <Magnetic intensity={0.1} actionArea="global" range={200}>
            <motion.div
              initial="rest"
              whileHover="hover"
              className="flex items-center justify-center w-full h-full text-zinc-400 hover:text-white transition-colors"
            >
              {children ?? (
                <motion.div
                  initial={false}
                  animate={{ rotate: open ? 90 : -90 }} // Toggle Rotasi
                  variants={{ rest: { scale: 1 }, hover: { scale: 1.15 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <AnimatedKanban size={22} strokeWidth={2.5} />
                </motion.div>
              )}
            </motion.div>
          </Magnetic>
        </GlassSurface>
      </motion.button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarHeader = ({ className, children, ...props }: any) => (
  <div
    className={`flex flex-col gap-2 p-4 border-b border-zinc-800/50 ${className || ""}`}
    {...props}
  >
    {children}
  </div>
);

export const SidebarContent = ({ className, children, ...props }: any) => (
  <ScrollArea
    className={`flex-1 overflow-auto custom-scrollbar ${className || ""}`}
    {...props}
  >
    <div className="flex flex-col gap-6 p-4">{children}</div>
  </ScrollArea>
);

export const SidebarGroup = ({ className, children, ...props }: any) => (
  <div
    className={`relative flex w-full min-w-0 flex-col ${className || ""}`}
    {...props}
  >
    {children}
  </div>
);

export const SidebarGroupLabel = ({ className, children, ...props }: any) => (
  <div
    className={`flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-bold uppercase tracking-widest text-zinc-500 outline-none transition-[margin,opa] ease-linear focus-visible:ring-2 ${className || ""}`}
    {...props}
  >
    {children}
  </div>
);

export const SidebarGroupContent = ({ className, children, ...props }: any) => (
  <div className={`w-full text-sm ${className || ""}`} {...props}>
    {children}
  </div>
);

export const SidebarMenu = ({ className, children, ...props }: any) => (
  <ul
    className={`flex w-full min-w-0 flex-col gap-1.5 ${className || ""}`}
    {...props}
  >
    {children}
  </ul>
);

export const SidebarMenuItem = ({ className, children, ...props }: any) => (
  <li className={`relative ${className || ""}`} {...props}>
    {children}
  </li>
);

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, any>(
  ({ className, isActive, children, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-lg p-2 text-left text-sm outline-none ring-zinc-500/20 transition-all hover:bg-zinc-800/80 hover:text-zinc-50 focus-visible:ring-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50
        ${isActive ? "bg-zinc-800 text-zinc-50 font-semibold shadow-sm" : "text-zinc-400"}
        ${className || ""}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarFooter = ({ className, children, ...props }: any) => (
  <div
    className={`flex flex-col gap-2 p-4 mt-auto border-t border-zinc-800/50 ${className || ""}`}
    {...props}
  >
    {children}
  </div>
);

export const SidebarInset = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <main
      ref={ref}
      className={`relative flex min-h-svh flex-1 flex-col bg-transparent overflow-hidden ${className || ""}`}
      {...props}
    >
      {children}
    </main>
  ),
);
SidebarInset.displayName = "SidebarInset";