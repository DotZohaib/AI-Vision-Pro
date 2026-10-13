'use client';

import { useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Users,
  FlipHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import type { CameraState, DetectionState, TrackingState, DigitalFramingState, AppSettings, CameraInfo } from '@/types';

interface CameraViewProps {
  cameraState: CameraState;
  detectionState: DetectionState;
  trackingState: TrackingState;
  framingState: DigitalFramingState;
  settings: AppSettings;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleTracking: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFacingMode: () => void;
  onSelectCamera: (deviceId: string) => void;
  onSelectFace: (id: string | null) => void;
}

export default function CameraView({
  cameraState,
  detectionState,
  trackingState,
  framingState,
  settings,
  videoRef,
  canvasRef,
  onStartCamera,
  onStopCamera,
  onToggleTracking,
  onResetView,
  onZoomIn,
  onZoomOut,
  onToggleFacingMode,
  onSelectCamera,
  onSelectFace,
}: CameraViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronized transform for BOTH video and canvas
  const transformStyle = useMemo(() => {
    const isTracking = trackingState.isActive && framingState.autoFrame;
    if (!isTracking) {
      const z = settings.digitalZoom;
      return {
        transform: `translate(0%, 0%) scale(${z})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }
    const { zoom, offsetX, offsetY } = framingState;
    const tx = offsetX * 100;
    const ty = offsetY * 100;
    return {
      transform: `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${zoom.toFixed(3)})`,
      transformOrigin: 'center center',
      willChange: 'transform',
    };
  }, [framingState, trackingState.isActive, settings.digitalZoom]);

  const hasCamera = cameraState.isActive;
  const isLoading = cameraState.isLoading || detectionState.isModelLoading;
  const hasError = !!cameraState.error;
  const faceCount = detectionState.currentFaces.length;

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSelectFace || detectionState.currentFaces.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const clicked = detectionState.currentFaces.find((face) => {
        const bb = face.boundingBox;
        return (
          clickX >= bb.x &&
          clickX <= bb.x + bb.width &&
          clickY >= bb.y &&
          clickY <= bb.y + bb.height
        );
      });
      if (clicked) {
        onSelectFace(clicked.id);
      }
    },
    [canvasRef, detectionState.currentFaces, onSelectFace]
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Viewport container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm aspect-video max-h-[65vh] min-h-[260px] sm:min-h-[340px] flex items-center justify-center"
      >
        {/* Inner wrapper that scales video AND canvas together */}
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={transformStyle}
        >
          {/* Video element */}
          <video
            ref={videoRef}
            id="camera-video"
            muted
            playsInline
            autoPlay
            aria-label="Live camera feed"
            className="w-full h-full object-contain"
            style={{
              opacity: hasCamera ? 1 : 0,
            }}
          />

          {/* Detection canvas overlay with interactive face clicking */}
          <canvas
            ref={canvasRef}
            id="detection-canvas"
            onClick={handleCanvasClick}
            className="absolute inset-0 w-full h-full object-contain cursor-crosshair pointer-events-auto"
            style={{
              opacity: hasCamera ? 1 : 0,
            }}
          />
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-4"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3">
                <Loader2 size={24} className="text-blue-500 animate-spin" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {detectionState.isModelLoading ? 'Initializing AI Engine…' : 'Accessing Camera…'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {detectionState.isModelLoading
                  ? 'Loading local MediaPipe vision models directly into browser memory'
                  : 'Requesting webcam permissions from browser'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {hasError && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-base text-white mb-1">Camera Access Issue</h3>
              <p className="text-xs text-slate-300 mb-4 max-w-sm leading-relaxed">
                {cameraState.error}
              </p>
              <button
                id="retry-camera-btn"
                onClick={onStartCamera}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera offline empty state */}
        {!hasCamera && !isLoading && !hasError && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400">
              <Camera size={28} />
            </div>
            <h3 className="font-semibold text-base text-white mb-1">Camera Inactive</h3>
            <p className="text-xs text-slate-400 mb-5 max-w-xs">
              Enable your webcam to start real-time face detection, people counting, and tracking.
            </p>
            <button
              id="start-camera-btn-main"
              onClick={onStartCamera}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors min-h-[44px]"
            >
              <Camera size={16} />
              Start Camera
            </button>
          </div>
        )}

        {/* Live status HUD pills (Visible when camera is active) */}
        {hasCamera && (
          <>
            {/* Top Left: Face count indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md z-10">
              <span
                className={`w-2 h-2 rounded-full ${
                  faceCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <Users
                size={14}
                className={faceCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {faceCount} {faceCount === 1 ? 'Face Detected' : 'Faces Detected'}
              </span>
            </div>

            {/* Top Right: Resolution and FPS badge */}
            {cameraState.resolution && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-md z-10">
                {cameraState.resolution.width}×{cameraState.resolution.height}
                {cameraState.frameRate ? ` • ${Math.round(cameraState.frameRate)} FPS` : ''}
              </div>
            )}

            {/* Bottom Left: Tracking badge */}
            {trackingState.isActive && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/95 text-white text-xs font-medium shadow-sm backdrop-blur-md z-10">
                <Crosshair size={13} className="animate-spin" />
                <span>Auto-Tracking Active</span>
              </div>
            )}

            {/* Bottom Right: Digital Zoom level badge */}
            {(framingState.zoom !== 1 || settings.digitalZoom !== 1) && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white border border-white/20 text-xs font-mono backdrop-blur-md z-10">
                {(trackingState.isActive ? framingState.zoom : settings.digitalZoom).toFixed(1)}× Zoom
              </div>
            )}
          </>
        )}
      </div>

      {/* Touch-friendly Camera Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        {/* Left cluster: Camera Toggle + Tracking Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Camera Start/Stop Button (44px target) */}
          <button
            id="camera-toggle-btn"
            onClick={hasCamera ? onStopCamera : onStartCamera}
            disabled={isLoading}
            aria-label={hasCamera ? 'Stop camera' : 'Start camera'}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors ${
              hasCamera
                ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {hasCamera ? <CameraOff size={16} /> : <Camera size={16} />}
            <span>{hasCamera ? 'Stop Camera' : 'Start Camera'}</span>
          </button>

          {/* Auto Track Button (44px target) */}
          <button
            id="tracking-toggle-btn"
            onClick={onToggleTracking}
            disabled={!hasCamera}
            aria-label={trackingState.isActive ? 'Disable auto tracking' : 'Enable auto tracking'}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors ${
              trackingState.isActive
                ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            } ${!hasCamera ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Crosshair size={16} />
            <span>{trackingState.isActive ? 'Tracking ON' : 'Auto Track'}</span>
          </button>
        </div>

        {/* Center / Right cluster: Zoom controls & Device selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Out / Zoom In / Reset View (44x44px touch targets) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              id="zoom-out-btn"
              onClick={onZoomOut}
              disabled={!hasCamera}
              aria-label="Zoom out"
              title="Zoom out"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <button
              id="zoom-in-btn"
              onClick={onZoomIn}
              disabled={!hasCamera}
              aria-label="Zoom in"
              title="Zoom in"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            <button
              id="reset-view-btn"
              onClick={onResetView}
              disabled={!hasCamera}
              aria-label="Reset zoom and framing"
              title="Reset view"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Mobile Flip Camera Button (if multiple cameras available) */}
          {cameraState.availableDevices.length > 1 && (
            <button
              id="flip-camera-btn"
              onClick={onToggleFacingMode}
              disabled={!hasCamera}
              aria-label="Flip camera front/rear"
              title="Flip camera"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <FlipHorizontal size={16} />
            </button>
          )}

          {/* Camera device selection dropdown */}
          {cameraState.availableDevices.length > 0 && (
            <div className="flex items-center">
              <select
                id="camera-selector"
                value={cameraState.selectedDeviceId ?? ''}
                onChange={(e) => onSelectCamera(e.target.value)}
                aria-label="Select camera"
                className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[170px] sm:max-w-[210px] truncate"
              >
                <option value="">Default Camera</option>
                {cameraState.availableDevices.map((d: CameraInfo) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}…`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

