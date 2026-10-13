'use client';

import { motion } from 'framer-motion';
import {
  Crosshair,
  Target,
  Sliders,
  Info,
  CheckCircle,
  XCircle,
  Monitor,
  HardDrive,
  RotateCcw,
} from 'lucide-react';
import type { TrackingState, DetectedFace, AppSettings } from '@/types';

interface FaceTrackingControllerProps {
  trackingState: TrackingState;
  currentFaces?: DetectedFace[];
  faces?: DetectedFace[];
  settings: AppSettings;
  onToggleTracking: () => void;
  onSelectTargetFace?: (id: string | null) => void;
  onSelectFace?: (id: string | null) => void;
  onResetView?: () => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  isCameraActive?: boolean;
}

export default function FaceTrackingController({
  trackingState,
  currentFaces,
  faces,
  settings,
  onToggleTracking,
  onSelectTargetFace,
  onSelectFace,
  onResetView,
  onUpdateSettings,
  isCameraActive = true,
}: FaceTrackingControllerProps) {
  const { isActive, selectedFaceId, smoothedPosition, mode } = trackingState;
  const faceList = currentFaces ?? faces ?? [];
  const handleSelect = onSelectTargetFace ?? onSelectFace ?? (() => {});

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Information Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Digital Tracking Active — Physical Camera Movement Not Supported: </span>
            This system tracks faces via software viewport transformation. Standard USB webcams do not possess motorized pan-tilt servos; physical PTZ movement is only enabled when certified hardware is interfaced.
          </div>
        </div>
      </div>

      {/* Main Tracking Control Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Crosshair size={20} className={isActive ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900 dark:text-white">
              Digital Auto-Tracking
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isActive ? 'Centering viewport on target face' : 'Feature currently inactive'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onResetView && (
            <button
              id="tracking-reset-view"
              onClick={onResetView}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium inline-flex items-center gap-1.5 min-h-[40px] cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              Reset Framing
            </button>
          )}

          <button
            id="tracking-main-toggle"
            onClick={onToggleTracking}
            disabled={!isCameraActive}
            aria-label={isActive ? 'Disable tracking' : 'Enable tracking'}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-2 min-h-[40px] transition-colors ${
              isActive
                ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            } ${!isCameraActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isActive ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </div>

      {/* Tracking Mode Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Tracking Mode
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <ModeButton
            id="mode-digital"
            icon={<Monitor size={16} />}
            label="Digital Auto-Framing"
            description="Smooth software zoom & crop"
            active={mode === 'digital'}
            onClick={() => onUpdateSettings({ trackingMode: 'digital' })}
          />
          <ModeButton
            id="mode-ptz"
            icon={<HardDrive size={16} />}
            label="Physical PTZ Motor"
            description="Motorized hardware required"
            active={mode === 'ptz'}
            disabled={true}
            disabledNote="No PTZ hardware connected"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Target Face Selector */}
      {faceList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Target Face Assignment
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              id="target-auto"
              onClick={() => handleSelect(null)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-left transition-colors min-h-[44px] cursor-pointer ${
                !selectedFaceId
                  ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Target size={15} />
              <span>Auto Selection (Closest / Most Prominent Face)</span>
            </button>

            {faceList.map((face) => (
              <button
                key={face.id}
                id={`target-face-${face.trackingId}`}
                onClick={() => handleSelect(face.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[44px] cursor-pointer ${
                  selectedFaceId === face.id
                    ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Face ID #{String(face.trackingId).padStart(2, '0')}</span>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {Math.round(face.confidence * 100)}% Confidence
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracking Parameters Sliders */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={16} className="text-blue-600 dark:text-blue-400" />
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Framing Parameters
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SliderSetting
            id="tracking-speed"
            label="Framing Speed / Responsiveness"
            value={settings.trackingSpeed}
            min={0.01}
            max={0.3}
            step={0.01}
            displayValue={`${Math.round(settings.trackingSpeed * 100)}%`}
            onChange={(v) => onUpdateSettings({ trackingSpeed: v })}
          />
          <SliderSetting
            id="tracking-sensitivity"
            label="Motion Sensitivity"
            value={settings.trackingSensitivity}
            min={0.1}
            max={1}
            step={0.05}
            displayValue={`${Math.round(settings.trackingSensitivity * 100)}%`}
            onChange={(v) => onUpdateSettings({ trackingSensitivity: v })}
          />
          <SliderSetting
            id="tracking-deadzone"
            label="Stabilization Dead Zone"
            value={settings.trackingDeadZone}
            min={1}
            max={30}
            step={1}
            displayValue={`${settings.trackingDeadZone}%`}
            onChange={(v) => onUpdateSettings({ trackingDeadZone: v })}
          />
        </div>
      </div>

      {/* Normalized Frame Coordinate Monitor */}
      {isActive && smoothedPosition && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Target Frame Coordinates
          </div>
          <div className="relative rounded-xl overflow-hidden h-24 bg-slate-900 border border-slate-800">
            {/* Center crosshair */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20" />

            {/* Target marker */}
            <motion.div
              animate={{
                left: `${smoothedPosition.x * 100}%`,
                top: `${smoothedPosition.y * 100}%`,
              }}
              transition={{ duration: 0.1, ease: 'linear' }}
              className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full border-2 border-white shadow-sm"
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>X: {(smoothedPosition.x * 100).toFixed(1)}%</span>
            <span>Y: {(smoothedPosition.y * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModeButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledNote?: string;
}

function ModeButton({ id, icon, label, description, active, onClick, disabled, disabledNote }: ModeButtonProps) {
  return (
    <button
      id={id}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 p-3.5 rounded-xl text-left border transition-all ${
        active
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-900 dark:text-blue-100'
          : disabled
          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>{icon}</span>
        <span className="text-xs sm:text-sm font-semibold">{label}</span>
        {active && <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 ml-auto" />}
        {disabled && <XCircle size={14} className="text-slate-400 ml-auto" />}
      </div>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {disabledNote ?? description}
      </span>
    </button>
  );
}

interface SliderSettingProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}

function SliderSetting({ id, label, value, min, max, step, displayValue, onChange }: SliderSettingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor={id} className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{displayValue}</span>
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

