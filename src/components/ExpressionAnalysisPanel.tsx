'use client';

import { motion } from 'framer-motion';
import { SmilePlus, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import type { DetectedFace, DetectionState, ExpressionLabel } from '@/types';

interface ExpressionAnalysisPanelProps {
  faces?: DetectedFace[];
  detectionState?: DetectionState;
  enabled: boolean;
  isRunning?: boolean;
  onToggleEnabled?: () => void;
}

const expressionColors: Record<ExpressionLabel, string> = {
  Happy: '#16A34A',
  Sad: '#64748B',
  Surprised: '#D97706',
  Angry: '#DC2626',
  Neutral: '#2563EB',
  Disgusted: '#7C3AED',
  Fearful: '#0284C7',
  Uncertain: '#94A3B8',
};

const expressionEmoji: Record<ExpressionLabel, string> = {
  Happy: '😊',
  Sad: '😔',
  Surprised: '😲',
  Angry: '😠',
  Neutral: '😐',
  Disgusted: '🤢',
  Fearful: '😨',
  Uncertain: '❓',
};

export default function ExpressionAnalysisPanel({
  faces,
  detectionState,
  enabled,
  isRunning,
  onToggleEnabled,
}: ExpressionAnalysisPanelProps) {
  const activeFaces = faces ?? detectionState?.currentFaces ?? [];
  const running = isRunning ?? detectionState?.isRunning ?? false;

  if (!enabled) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 shadow-sm min-h-[160px]">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
          <EyeOff size={18} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Expression Analysis Disabled
        </h4>
        <p className="text-xs text-slate-500 max-w-xs">
          Enable to estimate facial blendshapes and classify approximate expressions.
        </p>
        {onToggleEnabled && (
          <button
            onClick={onToggleEnabled}
            className="mt-2 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Enable Analysis
          </button>
        )}
      </div>
    );
  }

  if (!running || activeFaces.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 shadow-sm min-h-[160px]">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
          <SmilePlus size={20} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {running ? 'Awaiting Face Detection' : 'Camera Offline'}
        </h4>
        <p className="text-xs text-slate-500 max-w-xs">
          {running
            ? 'Position a face in front of the lens to evaluate facial blendshapes.'
            : 'Start camera to begin real-time expression analysis.'}
        </p>
        <div className="text-[11px] text-slate-400 mt-1">
          Classification reflects geometric landmarks, not internal emotion.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header and disclaimer banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Expression Analysis
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Geometric Model
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Facial geometry estimates only. Does not diagnose psychological state, emotion, or intent.
          </span>
        </div>
      </div>

      {/* Face cards with expression meters */}
      {activeFaces.map((face) => {
        const exp = face.expressions;
        if (!exp) {
          return (
            <div
              key={face.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm text-xs text-slate-500"
            >
              Face ID #{String(face.trackingId).padStart(2, '0')} — computing blendshapes…
            </div>
          );
        }

        const color = expressionColors[exp.label] || '#2563EB';
        const emoji = expressionEmoji[exp.label] || '😐';

        const bars = [
          { key: 'happy', label: 'Happy', value: exp.happy, barColor: '#16A34A' },
          { key: 'neutral', label: 'Neutral', value: exp.neutral, barColor: '#2563EB' },
          { key: 'surprised', label: 'Surprised', value: exp.surprised, barColor: '#D97706' },
          { key: 'sad', label: 'Sad-like', value: exp.sad, barColor: '#64748B' },
          { key: 'angry', label: 'Angry-like', value: exp.angry, barColor: '#DC2626' },
        ];

        return (
          <div
            key={face.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3"
          >
            {/* Top row: Face ID + Prominent expression badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Face #{String(face.trackingId).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-sm">{emoji}</span>
                <span className="text-xs font-bold" style={{ color }}>
                  {exp.label}
                </span>
                {exp.confidence > 0 && (
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-1">
                    {Math.round(exp.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Expression classification meters */}
            <div className="flex flex-col gap-2">
              {bars.map((bar) => (
                <div key={bar.key} className="flex items-center gap-2">
                  <span className="text-xs w-20 flex-shrink-0 text-slate-600 dark:text-slate-400">
                    {bar.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      animate={{ width: `${Math.round(bar.value * 100)}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: bar.barColor }}
                    />
                  </div>
                  <span className="text-xs font-mono w-9 text-right text-slate-500 dark:text-slate-400">
                    {Math.round(bar.value * 100)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Eye blink metrics */}
            <div className="flex items-center gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Eye size={13} className="text-slate-400" />
                <span>Left Eye Closure:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {Math.round(exp.leftEyeBlink * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Eye size={13} className="text-slate-400" />
                <span>Right Eye Closure:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {Math.round(exp.rightEyeBlink * 100)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

