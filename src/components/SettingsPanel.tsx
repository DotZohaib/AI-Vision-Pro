'use client';

import { useState } from 'react';
import {
  ScanFace,
  Crosshair,
  Sliders,
  Shield,
  Zap,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import type { AppSettings } from '@/types';
import { clearAllStorage } from '@/hooks/useLocalStorage';

interface SettingsPanelProps {
  settings: AppSettings;
  availableCameras: Array<{ deviceId: string; label: string }>;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onClearData: () => void;
}

export default function SettingsPanel({
  settings,
  availableCameras: _availableCameras,
  onUpdateSettings,
  onClearData,
}: SettingsPanelProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    clearAllStorage();
    onClearData();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Theme selection section */}
      <Section icon={<Sun size={16} />} title="Theme & Appearance">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Color Mode</div>
            <div className="text-xs text-slate-500">
              Toggle between refined light and accessible dark palettes
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sun size={13} />
              <span>Light</span>
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                settings.theme === 'dark'
                  ? 'bg-slate-700 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={13} />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </Section>

      {/* Detection settings */}
      <Section icon={<ScanFace size={16} />} title="Face Detection Engine">
        <SliderRow
          id="set-conf-threshold"
          label="Confidence Threshold"
          value={settings.detectionConfidenceThreshold}
          min={0.2}
          max={0.95}
          step={0.05}
          display={`${Math.round(settings.detectionConfidenceThreshold * 100)}%`}
          onChange={(v) => onUpdateSettings({ detectionConfidenceThreshold: v })}
        />
        <SliderRow
          id="set-detection-fps"
          label="Target Inference Frequency"
          value={settings.detectionFps}
          min={5}
          max={30}
          step={1}
          display={`${settings.detectionFps} FPS`}
          onChange={(v) => onUpdateSettings({ detectionFps: v })}
        />
        <ToggleRow
          id="set-show-boxes"
          label="Display Face Bounding Boxes"
          checked={settings.showBoundingBoxes}
          onChange={(v) => onUpdateSettings({ showBoundingBoxes: v })}
        />
        <ToggleRow
          id="set-show-ids"
          label="Display Persistent Tracking IDs"
          checked={settings.showTrackingIds}
          onChange={(v) => onUpdateSettings({ showTrackingIds: v })}
        />
        <ToggleRow
          id="set-show-confidence"
          label="Display Confidence Percentage Badges"
          checked={settings.showConfidence}
          onChange={(v) => onUpdateSettings({ showConfidence: v })}
        />
        <ToggleRow
          id="set-show-landmarks"
          label="Display 478 Mesh Face Landmarks"
          checked={settings.showLandmarks}
          onChange={(v) => onUpdateSettings({ showLandmarks: v })}
        />
      </Section>

      {/* Tracking settings */}
      <Section icon={<Crosshair size={16} />} title="Auto-Tracking & Framing">
        <SliderRow
          id="set-track-speed"
          label="Tracking Interpolation Speed"
          value={settings.trackingSpeed}
          min={0.01}
          max={0.3}
          step={0.01}
          display={`${Math.round(settings.trackingSpeed * 100)}%`}
          onChange={(v) => onUpdateSettings({ trackingSpeed: v })}
        />
        <SliderRow
          id="set-track-sensitivity"
          label="Subject Motion Sensitivity"
          value={settings.trackingSensitivity}
          min={0.1}
          max={1}
          step={0.05}
          display={`${Math.round(settings.trackingSensitivity * 100)}%`}
          onChange={(v) => onUpdateSettings({ trackingSensitivity: v })}
        />
        <SliderRow
          id="set-dead-zone"
          label="Jitter Suppression Dead Zone"
          value={settings.trackingDeadZone}
          min={1}
          max={30}
          step={1}
          display={`${settings.trackingDeadZone}%`}
          onChange={(v) => onUpdateSettings({ trackingDeadZone: v })}
        />
        <ToggleRow
          id="set-auto-switch"
          label="Auto-switch to Closest Face"
          checked={settings.autoTrackSwitch}
          onChange={(v) => onUpdateSettings({ autoTrackSwitch: v })}
        />
      </Section>

      {/* Framing */}
      <Section icon={<Sliders size={16} />} title="Digital Viewport Zoom">
        <SliderRow
          id="set-digital-zoom"
          label="Manual Base Zoom Factor"
          value={settings.digitalZoom}
          min={1}
          max={4}
          step={0.1}
          display={`${settings.digitalZoom.toFixed(1)}×`}
          onChange={(v) => onUpdateSettings({ digitalZoom: v })}
        />
        <ToggleRow
          id="set-auto-framing"
          label="Enable Dynamic Auto-Framing"
          checked={settings.autoFraming}
          onChange={(v) => onUpdateSettings({ autoFraming: v })}
        />
      </Section>

      {/* Expression analysis */}
      <Section icon={<Zap size={16} />} title="AI Blendshape Analysis">
        <ToggleRow
          id="set-expression-analysis"
          label="Enable Real-Time Expression Analysis"
          checked={settings.expressionAnalysis}
          onChange={(v) => onUpdateSettings({ expressionAnalysis: v })}
        />
        <p className="text-xs text-slate-500">
          Infers 52 facial blendshapes locally. Uses CPU/WebGL fallback for maximum compatibility.
        </p>
      </Section>

      {/* Privacy & Storage */}
      <Section icon={<Shield size={16} />} title="Privacy & Local Storage">
        <ToggleRow
          id="set-session-history"
          label="Record Anonymous Session Summaries"
          checked={settings.saveSessionHistory}
          onChange={(v) => onUpdateSettings({ saveSessionHistory: v })}
        />
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-medium text-slate-800 dark:text-slate-200">Local Privacy Architecture:</p>
          <p>✓ 100% on-device vision processing — zero video frames leave your device.</p>
          <p>✓ No raw images, recordings, or facial biometric templates are stored.</p>
          <p>✓ Only anonymized numeric counts and preferences are persisted in browser LocalStorage.</p>
        </div>

        {showClearConfirm ? (
          <div className="flex gap-2 mt-2">
            <button
              id="confirm-clear-btn"
              onClick={handleClear}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Confirm Wipe All Data
            </button>
            <button
              id="cancel-clear-btn"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            id="clear-data-btn"
            onClick={() => setShowClearConfirm(true)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
          >
            <Trash2 size={14} />
            Clear Local Storage Data
          </button>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor={id} className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
      />
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between min-h-[36px]">
      <label htmlFor={id} className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
        {label}
      </label>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
      </label>
    </div>
  );
}

