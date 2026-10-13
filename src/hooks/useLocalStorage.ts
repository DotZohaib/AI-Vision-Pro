'use client';

import { useSyncExternalStore, useCallback } from 'react';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const STORAGE_VERSION = 'v1';
const STORAGE_KEY = `aivisionpro_settings_${STORAGE_VERSION}`;

function isValidSettings(obj: unknown): obj is AppSettings {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.detectionConfidenceThreshold === 'number' &&
    typeof s.detectionFps === 'number' &&
    typeof s.showBoundingBoxes === 'boolean'
  );
}

const dispatchStorageChange = (key: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:storage_change', { detail: { key } }));
  }
};

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validator?: (v: unknown) => v is T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorage = (e: StorageEvent | CustomEvent) => {
        if ('key' in e && e.key && e.key !== key) return;
        callback();
      };
      window.addEventListener('storage', handleStorage as EventListener);
      window.addEventListener('app:storage_change', handleStorage as EventListener);
      return () => {
        window.removeEventListener('storage', handleStorage as EventListener);
        window.removeEventListener('app:storage_change', handleStorage as EventListener);
      };
    },
    [key]
  );

  const getSnapshot = useCallback((): string => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }, [key]);

  const getServerSnapshot = useCallback((): string => '', []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let value = defaultValue;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!validator || validator(parsed)) {
        value = parsed;
      }
    } catch {
      // ignore
    }
  }

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        let current = defaultValue;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (!validator || validator(parsed)) {
              current = parsed;
            }
          } catch {
            // ignore
          }
        }
        const next =
          typeof newValue === 'function'
            ? (newValue as (p: T) => T)(current)
            : newValue;
        localStorage.setItem(key, JSON.stringify(next));
        dispatchStorageChange(key);
      } catch {
        // quota exceeded
      }
    },
    [key, defaultValue, validator]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
      dispatchStorageChange(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, set, clear];
}

export function useSettings() {
  return useLocalStorage<AppSettings>(STORAGE_KEY, DEFAULT_SETTINGS, isValidSettings);
}

export function useCameraPreference() {
  return useLocalStorage<string | null>('aivisionpro_preferred_camera', null);
}

export function clearAllStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('aivisionpro_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('app:storage_change', { detail: { key: '*' } }));
  } catch {
    // ignore
  }
}
