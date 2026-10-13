'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Cpu,
  Clock,
  Wifi,
  WifiOff,
  Menu,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import type { CameraState, DetectionState, SidebarPage } from '@/types';

interface TopNavProps {
  currentPage?: SidebarPage;
  cameraState: CameraState;
  detectionState: DetectionState;
  sessionStartTime: number | null;
  onMenuClick: () => void;
  showMenu?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const pageTitles: Record<SidebarPage, { title: string; subtitle: string }> = {
  overview: { title: 'Vision Workspace', subtitle: 'Live Camera & AI Detection Center' },
  camera: { title: 'Live Camera Stream', subtitle: 'Direct Hardware View & Frame Controls' },
  detection: { title: 'Face Detection Pipeline', subtitle: 'BlazeFace Model & Coordinate Mesh' },
  tracking: { title: 'Digital Auto-Tracking', subtitle: 'Subject Centering & Spatial Framing' },
  expressions: { title: 'Facial Blendshape AI', subtitle: 'Geometric Landmark Classification' },
  analytics: { title: 'Telemetry Analytics', subtitle: 'Real-Time Occupancy & FPS Metrics' },
  history: { title: 'Session History', subtitle: 'Archived Local Detection Logs' },
  settings: { title: 'System Settings', subtitle: 'Detection Thresholds & Storage Options' },
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TopNav({
  currentPage = 'overview',
  cameraState,
  detectionState,
  sessionStartTime,
  onMenuClick,
  showMenu,
  theme = 'light',
  onToggleTheme,
}: TopNavProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const elapsed = sessionStartTime && now ? Math.max(0, now - sessionStartTime) : 0;

  const cameraOnline = cameraState.isActive;
  const modelReady = detectionState.isModelLoaded;
  const modelLoading = detectionState.isModelLoading;

  const currentMeta = pageTitles[currentPage] ?? pageTitles.overview;

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-30 transition-colors">
      {/* Left: Mobile branding with menu OR Desktop contextual view title */}
      <div className="flex items-center gap-3">
        {showMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          {/* Mobile title */}
          <div className="sm:hidden font-bold text-sm text-slate-900 dark:text-white leading-tight">
            AI Vision Pro
          </div>
          {/* Desktop contextual title (No duplicate 'AI Vision Pro') */}
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {currentMeta.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Status chips and theme switch */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Camera status badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            cameraOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {cameraOnline ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
          <span className="hidden xs:inline">{cameraOnline ? 'Live' : 'Offline'}</span>
        </div>

        {/* AI Model status badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            modelLoading
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
              : modelReady
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {modelLoading ? (
            <Cpu size={12} className="animate-spin text-amber-600" />
          ) : modelReady ? (
            <CheckCircle2 size={12} className="text-emerald-600" />
          ) : (
            <AlertCircle size={12} className="text-slate-500" />
          )}
          <span className="hidden sm:inline">
            {modelLoading ? 'Loading AI…' : modelReady ? 'AI Ready' : 'AI Standby'}
          </span>
        </div>

        {/* FPS indicator */}
        {detectionState.isRunning && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
            <Camera size={11} />
            <span>{detectionState.fps} FPS</span>
          </div>
        )}

        {/* Session timer badge */}
        {sessionStartTime && (
          <div className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Clock size={11} />
            <span>{formatDuration(elapsed)}</span>
          </div>
        )}

        {/* Theme toggle button */}
        {onToggleTheme && (
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer ml-1"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>
    </header>
  );
}

