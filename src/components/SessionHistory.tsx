'use client';

import { motion } from 'framer-motion';
import { History, Clock, Users, Activity, Trash2 } from 'lucide-react';
import type { SessionData } from '@/types';

interface SessionHistoryProps {
  sessions: SessionData[];
  onClear: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionHistory({ sessions, onClear }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <History size={24} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            No Session History Recorded
          </div>
          <div className="text-xs text-slate-500 mt-1 max-w-xs">
            Start the camera and run face detection. Completed sessions will be archived here anonymously in your browser.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header bar with total and clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Past Sessions ({sessions.length})
          </span>
        </div>
        {sessions.length > 0 && (
          <button
            id="clear-history-btn"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Session cards */}
      {[...sessions].reverse().map((session, idx) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Session #{sessions.length - idx}
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(session.startTime)}
              </div>
            </div>
            <div
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                session.endTime
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
              }`}
            >
              {session.endTime ? 'Completed' : 'Active'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatBadge
              icon={<Clock size={13} />}
              label="Session Time"
              value={session.duration ? formatDuration(session.duration) : 'In progress'}
              color="#2563EB"
              bgClass="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40"
            />
            <StatBadge
              icon={<Users size={13} />}
              label="Peak Faces"
              value={String(session.peakFaceCount)}
              color="#16A34A"
              bgClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40"
            />
            <StatBadge
              icon={<Activity size={13} />}
              label="Inferences"
              value={String(session.totalDetectionEvents)}
              color="#0F172A"
              bgClass="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-xl p-2.5 flex flex-col gap-1 border ${bgClass}`}>
      <div className="flex items-center gap-1.5 opacity-80">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-sm font-bold font-mono">
        {value}
      </div>
    </div>
  );
}

