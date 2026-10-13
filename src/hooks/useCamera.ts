'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CameraState, CameraInfo, PtzCapabilities } from '@/types';

const INITIAL_STATE: CameraState = {
  isActive: false,
  isLoading: false,
  error: null,
  resolution: null,
  frameRate: null,
  selectedDeviceId: null,
  availableDevices: [],
  facingMode: 'user',
  ptzCapabilities: { supported: false },
};

export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  preferredDeviceId?: string | null
) {
  const [state, setState] = useState<CameraState>(INITIAL_STATE);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRateTimerRef = useRef<number | null>(null);

  // Enumerate camera devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras: CameraInfo[] = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));
      setState((prev) => ({ ...prev, availableDevices: cameras }));
      return cameras;
    } catch {
      return [];
    }
  }, []);

  // Stop the current stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (frameRateTimerRef.current) {
      clearInterval(frameRateTimerRef.current);
    }
    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
      error: null,
      resolution: null,
      frameRate: null,
    }));
  }, [videoRef]);

  // Start the camera
  const startCamera = useCallback(
    async (deviceId?: string, facingMode: 'user' | 'environment' = 'user') => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState((prev) => ({
          ...prev,
          error: 'Camera API not supported in this browser.',
          isLoading: false,
        }));
        return false;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: deviceId ? undefined : facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr) {
          const errName = (firstErr as Error).name;
          if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw firstErr;
          }
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve, reject) => {
            const v = videoRef.current!;
            v.onloadedmetadata = () => resolve();
            v.onerror = () => reject(new Error('Video element error'));
            setTimeout(reject, 10000, new Error('Timeout waiting for video'));
          });
          await videoRef.current.play();
        }

        // Read track settings and hardware PTZ capabilities
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        let ptzCapabilities: PtzCapabilities = { supported: false };
        try {
          const caps = (track?.getCapabilities?.() ?? {}) as Record<string, unknown>;
          const hasPan = 'pan' in caps && !!caps.pan;
          const hasTilt = 'tilt' in caps && !!caps.tilt;
          const hasZoom = 'zoom' in caps && !!caps.zoom;
          ptzCapabilities = {
            supported: hasPan || hasTilt,
            pan: caps.pan as PtzCapabilities['pan'],
            tilt: caps.tilt as PtzCapabilities['tilt'],
            zoom: caps.zoom as PtzCapabilities['zoom'],
          };
        } catch {
          ptzCapabilities = { supported: false };
        }

        setState((prev) => ({
          ...prev,
          isActive: true,
          isLoading: false,
          error: null,
          resolution:
            settings?.width && settings?.height
              ? { width: settings.width, height: settings.height }
              : null,
          frameRate: settings?.frameRate ?? null,
          selectedDeviceId: deviceId ?? settings?.deviceId ?? null,
          facingMode,
          ptzCapabilities,
        }));

        // Re-enumerate to get labels
        await enumerateDevices();

        // Handle track ending
        track?.addEventListener('ended', () => {
          stopCamera();
        });

        return true;
      } catch (err) {
        const error = err as Error;
        let message = 'Failed to access camera.';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Please allow camera access and retry.';
        } else if (error.name === 'NotFoundError') {
          message = 'No camera found. Please connect a camera and retry.';
        } else if (error.name === 'NotReadableError') {
          message = 'Camera is in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
          message = 'Selected camera does not support the requested settings.';
        } else if (error.message) {
          message = error.message;
        }
        setState((prev) => ({ ...prev, isLoading: false, error: message, isActive: false }));
        return false;
      }
    },
    [videoRef, enumerateDevices, stopCamera]
  );

  // Switch camera
  const switchCamera = useCallback(
    async (deviceId: string) => {
      await startCamera(deviceId, state.facingMode);
    },
    [startCamera, state.facingMode]
  );

  // Toggle facing mode (mobile)
  const toggleFacingMode = useCallback(async () => {
    const newMode = state.facingMode === 'user' ? 'environment' : 'user';
    await startCamera(undefined, newMode);
  }, [state.facingMode, startCamera]);

  // Initial device enumeration with devicechange listener
  useEffect(() => {
    let unmounted = false;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (unmounted) return;
          const cameras: CameraInfo[] = devices
            .filter((d) => d.kind === 'videoinput')
            .map((d) => ({
              deviceId: d.deviceId,
              label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
              kind: 'videoinput' as const,
            }));
          setState((prev) => ({ ...prev, availableDevices: cameras }));
        })
        .catch(() => {});
    }

    const onDeviceChange = () => {
      void enumerateDevices();
    };
    navigator.mediaDevices?.addEventListener('devicechange', onDeviceChange);

    return () => {
      unmounted = true;
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
    };
  }, [enumerateDevices]);

  // Cleanup on unmount
  useEffect(() => {
    const stream = streamRef.current;
    const timer = frameRateTimerRef.current;
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  return {
    state,
    streamRef,
    startCamera: (deviceId?: string) => startCamera(deviceId ?? preferredDeviceId ?? undefined),
    stopCamera,
    switchCamera,
    toggleFacingMode,
    enumerateDevices,
  };
}
