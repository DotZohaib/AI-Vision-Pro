'use client';

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Camera as CameraIcon,
  Crosshair as TrackingIcon,
  Activity as AnalyticsIcon,
  Settings as SettingsIcon,
  Loader2,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import CameraView from '@/components/CameraView';
import PeopleCounter from '@/components/PeopleCounter';
import ExpressionAnalysisPanel from '@/components/ExpressionAnalysisPanel';
import FaceTrackingController from '@/components/FaceTrackingController';
import DetectionAnalytics from '@/components/DetectionAnalytics';
import SessionHistory from '@/components/SessionHistory';
import SettingsPanel from '@/components/SettingsPanel';
import OverviewPage from '@/components/OverviewPage';

import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { useSettings, useCameraPreference, useLocalStorage, clearAllStorage } from '@/hooks/useLocalStorage';

import type { SidebarPage, SessionData, AppSettings, DetectedFace } from '@/types';

const FACE_HISTORY_SIZE = 120;

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const mobileBottomNavItems: { id: SidebarPage; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'camera', label: 'Camera', icon: <CameraIcon size={20} /> },
  { id: 'tracking', label: 'Tracking', icon: <TrackingIcon size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon size={20} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
];

export default function AppShell() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentPage, setCurrentPage] = useState<SidebarPage>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [faceHistory, setFaceHistory] = useState<Array<{ t: number; count: number }>>([]);

  // Hydration-safe mount detection
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Responsive mobile listener
  const isMobile = useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false),
    () => false
  );

  const [settings, setSettings] = useSettings();
  const [preferredCameraId, setPreferredCameraId] = useCameraPreference();
  const [sessionHistory, setSessionHistory, clearSessionHistory] = useLocalStorage<SessionData[]>(
    'aivisionpro_session_history_v1',
    []
  );

  // Sync theme to document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Camera hook
  const { state: cameraState, startCamera, stopCamera, toggleFacingMode } =
    useCamera(videoRef, preferredCameraId);

  // Tracking hook (instantiated first so callback can be referenced)
  const {
    trackingState,
    framingState,
    selectFace: selectTrackingFace,
    toggleTracking,
    resetView,
    updateTracking,
  } = useFaceTracking(videoRef, {
    speedFactor: settings.trackingSpeed,
    sensitivity: settings.trackingSensitivity,
    deadZonePercent: settings.trackingDeadZone,
    autoSwitch: settings.autoTrackSwitch,
    digitalZoom: settings.digitalZoom,
    autoFraming: settings.autoFraming,
    hasPtzHardware: cameraState.ptzCapabilities?.supported ?? false,
  });

  // Real-time synchronous detection callback
  const handleFacesDetected = useCallback(
    (faces: DetectedFace[]) => {
      if (trackingState.isActive) {
        updateTracking(faces);
      }
    },
    [trackingState.isActive, updateTracking]
  );

  // Detection hook
  const { detectionState, selectFace } = useFaceDetection(
    videoRef,
    canvasRef,
    cameraState.isActive,
    {
      detectionFps: settings.detectionFps,
      confidenceThreshold: settings.detectionConfidenceThreshold,
      showBoundingBoxes: settings.showBoundingBoxes,
      showTrackingIds: settings.showTrackingIds,
      showConfidence: settings.showConfidence,
      showLandmarks: settings.showLandmarks,
      expressionAnalysis: settings.expressionAnalysis,
    },
    handleFacesDetected
  );

  // Update tracking when faces change via React state as secondary sync
  useEffect(() => {
    if (trackingState.isActive && detectionState.currentFaces.length >= 0) {
      updateTracking(detectionState.currentFaces);
    }
  }, [detectionState.currentFaces, trackingState.isActive, updateTracking]);

  // Face history for chart (deferred update to prevent cascading render warnings)
  useEffect(() => {
    if (!detectionState.isRunning) return;
    const entry = { t: Date.now(), count: detectionState.currentFaces.length };
    const timer = setTimeout(() => {
      setFaceHistory((prev) => {
        const next = [...prev, entry];
        return next.length > FACE_HISTORY_SIZE ? next.slice(-FACE_HISTORY_SIZE) : next;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [detectionState.currentFaces.length, detectionState.isRunning]);

  // Session management
  const handleStartCamera = useCallback(async (deviceId?: string) => {
    const ok = await startCamera(deviceId);
    if (ok) {
      const sessionId = generateSessionId();
      const now = Date.now();
      setSessionStartTime(now);
      const newSession: SessionData = {
        id: sessionId,
        startTime: now,
        duration: 0,
        peakFaceCount: 0,
        totalUniqueFaces: 0,
        totalDetectionEvents: 0,
        events: [],
      };
      setCurrentSession(newSession);
      setFaceHistory([]);
    }
  }, [startCamera]);

  const handleStopCamera = useCallback(() => {
    stopCamera();
    if (currentSession && sessionStartTime) {
      const endTime = Date.now();
      const completed: SessionData = {
        ...currentSession,
        endTime,
        duration: endTime - sessionStartTime,
        totalUniqueFaces: detectionState.totalUniqueFaces,
        totalDetectionEvents: detectionState.totalDetectionEvents,
        peakFaceCount: Math.max(0, ...faceHistory.map((h) => h.count)),
      };
      const updated = [...sessionHistory, completed].slice(-settings.maxSessionHistory);
      setSessionHistory(updated);
    }
    setCurrentSession(null);
    setSessionStartTime(null);
  }, [stopCamera, currentSession, sessionStartTime, detectionState, faceHistory, sessionHistory, settings, setSessionHistory]);

  const handleSelectFace = useCallback((id: string | null) => {
    selectFace(id);
    selectTrackingFace(id);
  }, [selectFace, selectTrackingFace]);

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, [setSettings]);

  const handleZoomIn = useCallback(() => {
    handleUpdateSettings({ digitalZoom: Math.min(4, settings.digitalZoom + 0.2) });
  }, [settings.digitalZoom, handleUpdateSettings]);

  const handleZoomOut = useCallback(() => {
    handleUpdateSettings({ digitalZoom: Math.max(1, settings.digitalZoom - 0.2) });
  }, [settings.digitalZoom, handleUpdateSettings]);

  const handleClearHistory = useCallback(() => {
    clearSessionHistory();
  }, [clearSessionHistory]);

  const handleClearAllData = useCallback(() => {
    clearAllStorage();
  }, []);

  // Render page content with proper mobile bottom padding
  const renderPageContent = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <div className="h-full pb-20 md:pb-6 overflow-y-auto">
            <OverviewPage
              cameraState={cameraState}
              detectionState={detectionState}
              trackingState={trackingState}
              framingState={framingState}
              settings={settings}
              videoRef={videoRef}
              canvasRef={canvasRef}
              currentSession={currentSession}
              faceHistory={faceHistory}
              onStartCamera={() => handleStartCamera()}
              onStopCamera={handleStopCamera}
              onToggleTracking={toggleTracking}
              onResetView={resetView}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleFacingMode={toggleFacingMode}
              onSelectCamera={(id) => {
                setPreferredCameraId(id);
                void handleStartCamera(id);
              }}
              onSelectFace={handleSelectFace}
              onUpdateSettings={handleUpdateSettings}
              onNavigate={setCurrentPage}
            />
          </div>
        );

      case 'camera':
      case 'detection':
        return (
          <div className="flex flex-col gap-4 p-3 sm:p-5 h-full overflow-y-auto pb-24 md:pb-6">
            {/* Live Camera View with Synchronized Face Overlays */}
            <CameraView
              cameraState={cameraState}
              detectionState={detectionState}
              trackingState={trackingState}
              framingState={framingState}
              settings={settings}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStartCamera={() => handleStartCamera()}
              onStopCamera={handleStopCamera}
              onToggleTracking={toggleTracking}
              onResetView={resetView}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleFacingMode={toggleFacingMode}
              onSelectCamera={(id) => {
                setPreferredCameraId(id);
                void handleStartCamera(id);
              }}
              onSelectFace={handleSelectFace}
            />

            {/* People & Presence Counter */}
            <PeopleCounter detectionState={detectionState} />

            {/* Secondary Panels (Analytics & Expressions) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DetectionAnalytics
                detectionState={detectionState}
                currentSession={currentSession}
                faceHistory={faceHistory}
              />
              <ExpressionAnalysisPanel
                detectionState={detectionState}
                enabled={settings.expressionAnalysis}
                onToggleEnabled={() =>
                  handleUpdateSettings({ expressionAnalysis: !settings.expressionAnalysis })
                }
              />
            </div>
          </div>
        );

      case 'tracking':
        return (
          <div className="flex flex-col gap-4 p-3 sm:p-5 h-full overflow-y-auto pb-24 md:pb-6">
            <CameraView
              cameraState={cameraState}
              detectionState={detectionState}
              trackingState={trackingState}
              framingState={framingState}
              settings={settings}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStartCamera={() => handleStartCamera()}
              onStopCamera={handleStopCamera}
              onToggleTracking={toggleTracking}
              onResetView={resetView}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleFacingMode={toggleFacingMode}
              onSelectCamera={(id) => {
                setPreferredCameraId(id);
                void handleStartCamera(id);
              }}
              onSelectFace={handleSelectFace}
            />

            <FaceTrackingController
              trackingState={trackingState}
              currentFaces={detectionState.currentFaces}
              settings={settings}
              onToggleTracking={toggleTracking}
              onSelectTargetFace={handleSelectFace}
              onResetView={resetView}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        );

      case 'expressions':
        return (
          <div className="flex flex-col gap-4 p-3 sm:p-5 h-full overflow-y-auto pb-24 md:pb-6">
            <CameraView
              cameraState={cameraState}
              detectionState={detectionState}
              trackingState={trackingState}
              framingState={framingState}
              settings={settings}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStartCamera={() => handleStartCamera()}
              onStopCamera={handleStopCamera}
              onToggleTracking={toggleTracking}
              onResetView={resetView}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleFacingMode={toggleFacingMode}
              onSelectCamera={(id) => {
                setPreferredCameraId(id);
                void handleStartCamera(id);
              }}
              onSelectFace={handleSelectFace}
            />
            <ExpressionAnalysisPanel
              detectionState={detectionState}
              enabled={settings.expressionAnalysis}
              onToggleEnabled={() =>
                handleUpdateSettings({ expressionAnalysis: !settings.expressionAnalysis })
              }
            />
          </div>
        );

      case 'analytics':
        return (
          <div className="p-3 sm:p-5 h-full overflow-y-auto flex flex-col gap-4 pb-24 md:pb-6">
            <PeopleCounter detectionState={detectionState} />
            <DetectionAnalytics
              detectionState={detectionState}
              currentSession={currentSession}
              faceHistory={faceHistory}
            />
          </div>
        );

      case 'history':
        return (
          <div className="p-3 sm:p-5 h-full overflow-y-auto pb-24 md:pb-6">
            <SessionHistory
              sessions={sessionHistory}
              onClear={handleClearHistory}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="p-3 sm:p-5 h-full overflow-y-auto pb-24 md:pb-6">
            <SettingsPanel
              settings={settings}
              availableCameras={cameraState.availableDevices}
              onUpdateSettings={handleUpdateSettings}
              onClearData={handleClearAllData}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <Loader2 size={32} className="text-blue-600 animate-spin mb-3" />
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading AI Vision Pro…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Desktop sidebar (>= md) */}
      {!isMobile && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      )}

      {/* Mobile drawer sidebar (< md) */}
      {isMobile && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          collapsed={false}
          onToggleCollapse={() => {}}
          isMobile={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main content workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top header navigation */}
        <TopNav
          currentPage={currentPage}
          cameraState={cameraState}
          detectionState={detectionState}
          sessionStartTime={sessionStartTime}
          onMenuClick={() => setMobileSidebarOpen(true)}
          showMenu={isMobile}
          theme={settings.theme}
          onToggleTheme={() =>
            handleUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
          }
        />

        {/* Page content main container */}
        <main
          id="main-content"
          className="flex-1 overflow-hidden"
          aria-label="Main content"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderPageContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile-first bottom navigation bar (< md) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-1 shadow-lg"
        >
          {mobileBottomNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => setCurrentPage(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center justify-center">{item.icon}</span>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

