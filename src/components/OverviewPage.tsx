'use client';

import { motion } from 'framer-motion';
import {
  Camera,
  Activity,
  Shield,
  Zap,
  Monitor,
  Sparkles,
} from 'lucide-react';

import CameraView from '@/components/CameraView';
import PeopleCounter from '@/components/PeopleCounter';
import FaceTrackingController from '@/components/FaceTrackingController';
import ExpressionAnalysisPanel from '@/components/ExpressionAnalysisPanel';
import DetectionAnalytics from '@/components/DetectionAnalytics';

import type {
  CameraState,
  DetectionState,
  TrackingState,
  DigitalFramingState,
  AppSettings,
  SessionData,
  SidebarPage,
} from '@/types';

interface OverviewPageProps {
  cameraState: CameraState;
  detectionState: DetectionState;
  trackingState: TrackingState;
  framingState: DigitalFramingState;
  settings: AppSettings;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentSession: SessionData | null;
  faceHistory: Array<{ t: number; count: number }>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleTracking: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFacingMode: () => void;
  onSelectCamera: (deviceId: string) => void;
  onSelectFace: (id: string | null) => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onNavigate: (page: SidebarPage) => void;
}

export default function OverviewPage({
  cameraState,
  detectionState,
  trackingState,
  framingState,
  settings,
  videoRef,
  canvasRef,
  currentSession,
  faceHistory,
  onStartCamera,
  onStopCamera,
  onToggleTracking,
  onResetView,
  onZoomIn,
  onZoomOut,
  onToggleFacingMode,
  onSelectCamera,
  onSelectFace,
  onUpdateSettings,
  onNavigate: _onNavigate,
}: OverviewPageProps) {
  const privacyPoints = [
    'All computer vision models execute locally on-device via WebAssembly/GPU',
    'Zero video frames or camera streams are transmitted over network connections',
    'No facial biometric templates, embeddings, or identity data are created or saved',
    'Session logs record strictly anonymous statistics in your local browser storage',
  ];

  return (
    <div className="flex flex-col gap-5 p-3 sm:p-5 w-full">
      {/* 1 & 2: Concise page title and workspace status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Live Vision Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            On-device face detection, IoU centroid tracking & spatial framing.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              cameraState.isActive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cameraState.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {cameraState.isActive ? 'Camera Stream Active' : 'Camera Ready (Standby)'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
            <Sparkles size={11} />
            <span>MediaPipe BlazeFace</span>
          </span>
        </div>
      </div>

      {/* 4 & 5: Live camera preview & essential camera controls */}
      <section aria-label="Camera Workspace" className="w-full">
        <CameraView
          cameraState={cameraState}
          detectionState={detectionState}
          trackingState={trackingState}
          framingState={framingState}
          settings={settings}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStartCamera={onStartCamera}
          onStopCamera={onStopCamera}
          onToggleTracking={onToggleTracking}
          onResetView={onResetView}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onToggleFacingMode={onToggleFacingMode}
          onSelectCamera={onSelectCamera}
          onSelectFace={onSelectFace}
        />
      </section>

      {/* 6: Current face count and presence metrics */}
      <section aria-label="Presence Telemetry" className="w-full">
        <PeopleCounter detectionState={detectionState} />
      </section>

      {/* 7: Face-detection, tracking & expression tools */}
      <section aria-label="Tracking & Intelligence Tools" className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <FaceTrackingController
          trackingState={trackingState}
          currentFaces={detectionState.currentFaces}
          settings={settings}
          onToggleTracking={onToggleTracking}
          onSelectTargetFace={onSelectFace}
          onResetView={onResetView}
          onUpdateSettings={onUpdateSettings}
          isCameraActive={cameraState.isActive}
        />

        <ExpressionAnalysisPanel
          detectionState={detectionState}
          enabled={settings?.expressionAnalysis ?? true}
          onToggleEnabled={() =>
            onUpdateSettings({ expressionAnalysis: !(settings?.expressionAnalysis ?? true) })
          }
        />
      </section>

      {/* 8: Supporting occupancy analytics timeline */}
      <section aria-label="Occupancy Timeline" className="w-full">
        <DetectionAnalytics
          detectionState={detectionState}
          currentSession={currentSession}
          faceHistory={faceHistory}
        />
      </section>

      {/* 9: System architecture & privacy details */}
      <section aria-label="System Information" className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Architecture details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Zap size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              System Architecture
            </h3>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {[
              ['Inference Runtime', 'MediaPipe Tasks Vision WASM'],
              ['Face Detector', 'BlazeFace (Sub-millisecond inference)'],
              ['Mesh Landmarker', '478 3D Coordinate Topology'],
              ['Tracking Algorithm', 'IoU Centroid Tracking with Velocity'],
              ['Web Stack', 'Next.js 16 App Router + TypeScript'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-0.5">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-900 dark:text-white font-mono text-[11px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy commitments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Shield size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Privacy Guarantees
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {privacyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                <span className="leading-tight">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hardware framing disclosure notice */}
      <div className="rounded-xl p-3.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <Monitor size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200">Hardware Framing Notice: </strong>
          Standard consumer webcams lack physical motorized pan and tilt servos. The Auto-Tracking engine operates digitally by dynamically scaling and centering the canvas coordinate matrix onto the active subject.
        </div>
      </div>
    </div>
  );
}


