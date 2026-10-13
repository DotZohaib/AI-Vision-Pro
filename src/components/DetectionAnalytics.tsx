'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Activity,
  ScanFace,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { DetectionState, SessionData } from '@/types';

interface DetectionAnalyticsProps {
  detectionState: DetectionState;
  currentSession: SessionData | null;
  faceHistory: Array<{ t: number; count: number }>;
}

export default function DetectionAnalytics({
  detectionState,
  currentSession: _currentSession,
  faceHistory,
}: DetectionAnalyticsProps) {
  const { currentFaces, totalUniqueFaces, fps, isRunning } = detectionState;

  // Prepare chart data (pure without Date.now() in render)
  const chartData = useMemo(() => {
    return faceHistory.slice(-60).map((item, _idx, arr) => {
      const last = arr[arr.length - 1];
      const relSec = last ? Math.max(0, Math.round((last.t - item.t) / 1000)) : 0;
      return {
        t: relSec === 0 ? 'Now' : `-${relSec}s`,
        faces: item.count,
      };
    });
  }, [faceHistory]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mini stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MiniStat
          icon={<ScanFace size={16} />}
          label="Active Faces"
          value={currentFaces.length}
          color="#16A34A"
          bgClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
        />
        <MiniStat
          icon={<Users size={16} />}
          label="Unique In Session"
          value={totalUniqueFaces}
          color="#2563EB"
          bgClass="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
        />
        <MiniStat
          icon={<Activity size={16} />}
          label="Inference FPS"
          value={isRunning ? fps : 0}
          color="#0284C7"
          bgClass="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"
        />
        <MiniStat
          icon={<TrendingUp size={16} />}
          label="Detection Events"
          value={detectionState.totalDetectionEvents}
          color="#0F172A"
          bgClass="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        />
      </div>

      {/* Face count chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Real-Time Occupancy Timeline
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Past 60 Samples
          </span>
        </div>

        {chartData.length > 1 ? (
          <div className="h-32 sm:h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="faceGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#0F172A',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                  formatter={(v: unknown) => [`${v} faces detected`, 'Face Count']}
                />
                <Area
                  type="monotone"
                  dataKey="faces"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#faceGradBlue)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-28 text-slate-400 text-xs">
            {isRunning ? 'Gathering real-time detection points…' : 'Start camera to stream detection telemetry'}
          </div>
        )}
      </div>

      {/* Currently visible faces list */}
      {currentFaces.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Active Identified Subjects ({currentFaces.length})
          </div>
          <div className="flex flex-col gap-2">
            {currentFaces.map((face) => (
              <div
                key={face.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold font-mono text-slate-900 dark:text-white">
                    Subject #{String(face.trackingId).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{Math.round(face.confidence * 100)}% Match</span>
                  {face.expressions && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                      {face.expressions.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center gap-2.5 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</div>
        <motion.div
          key={value}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          className="text-base font-bold font-mono text-slate-900 dark:text-white"
        >
          {value}
        </motion.div>
      </div>
    </div>
  );
}

