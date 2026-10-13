'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserCheck, TrendingUp, Activity } from 'lucide-react';
import type { DetectionState } from '@/types';

interface PeopleCounterProps {
  detectionState: DetectionState;
}

export default function PeopleCounter({ detectionState }: PeopleCounterProps) {
  const { currentFaces, totalUniqueFaces, totalDetectionEvents, fps, isRunning } = detectionState;
  const visible = currentFaces.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      <CountCard
        id="count-visible"
        icon={<Users size={18} />}
        label="Visible Now"
        value={visible}
        color={visible > 0 ? '#16A34A' : '#64748B'}
        bgClass={visible > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}
        subtext={visible === 1 ? '1 face in frame' : `${visible} faces in frame`}
      />
      <CountCard
        id="count-unique"
        icon={<UserCheck size={18} />}
        label="Session Total"
        value={totalUniqueFaces}
        color="#2563EB"
        bgClass="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
        subtext="Unique tracked faces"
      />
      <CountCard
        id="count-events"
        icon={<Activity size={18} />}
        label="Detection Events"
        value={totalDetectionEvents}
        color="#0F172A"
        bgClass="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        subtext="Pipeline inferences"
      />
      <CountCard
        id="count-fps"
        icon={<TrendingUp size={18} />}
        label="Inference FPS"
        value={isRunning ? fps : 0}
        color="#0284C7"
        bgClass="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"
        subtext="Real-time frame rate"
      />
    </div>
  );
}

interface CountCardProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgClass: string;
  subtext?: string;
}

function CountCard({ id, icon, label, value, color, bgClass, subtext }: CountCardProps) {
  return (
    <div
      id={id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white"
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>

      {subtext && (
        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
          {subtext}
        </span>
      )}
    </div>
  );
}

