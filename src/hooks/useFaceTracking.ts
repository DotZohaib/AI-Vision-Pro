'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TrackingState, DigitalFramingState, DetectedFace, TrackingMode } from '@/types';

const INITIAL_TRACKING: TrackingState = {
  mode: 'digital',
  isActive: false,
  selectedFaceId: null,
  targetPosition: null,
  smoothedPosition: null,
  deadZonePercent: 10,
  speedFactor: 0.08,
  sensitivity: 0.6,
  autoSwitch: true,
  isLocked: false,
};

const INITIAL_FRAMING: DigitalFramingState = {
  zoom: 1.0,
  offsetX: 0,
  offsetY: 0,
  autoFrame: true,
  targetZoom: 1.0,
  targetOffsetX: 0,
  targetOffsetY: 0,
};

interface TrackingConfig {
  speedFactor: number;
  sensitivity: number;
  deadZonePercent: number;
  autoSwitch: boolean;
  digitalZoom: number;
  autoFraming: boolean;
  hasPtzHardware?: boolean;
}

export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  trackingConfig: TrackingConfig
) {
  const [trackingState, setTrackingState] = useState<TrackingState>(INITIAL_TRACKING);
  const [framingState, setFramingState] = useState<DigitalFramingState>(INITIAL_FRAMING);

  const configRef = useRef<TrackingConfig>(trackingConfig);
  useEffect(() => {
    configRef.current = trackingConfig;
  }, [trackingConfig]);

  const animRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // High-frequency physics / interpolation state
  const currentZoomRef = useRef(1.0);
  const currentOffsetXRef = useRef(0);
  const currentOffsetYRef = useRef(0);

  const targetZoomRef = useRef(1.0);
  const targetOffsetXRef = useRef(0);
  const targetOffsetYRef = useRef(0);

  const smoothedFaceNormXRef = useRef(0.5);
  const smoothedFaceNormYRef = useRef(0.5);

  const lastTargetSeenTimeRef = useRef<number>(0);
  const lastTargetFaceIdRef = useRef<string | null>(null);

  const publishedFramingRef = useRef<DigitalFramingState>(INITIAL_FRAMING);
  const lastUiPublishedTimeRef = useRef<number>(0);

  // Select target face manually
  const selectFace = useCallback((faceId: string | null) => {
    lastTargetFaceIdRef.current = faceId;
    setTrackingState((prev) => ({
      ...prev,
      selectedFaceId: faceId,
      isLocked: !!faceId,
    }));
  }, []);

  // Toggle tracking on/off
  const toggleTracking = useCallback(() => {
    setTrackingState((prev) => {
      const nextActive = !prev.isActive;
      if (!nextActive) {
        // When turning off, smoothly return to base zoom and center
        targetOffsetXRef.current = 0;
        targetOffsetYRef.current = 0;
        targetZoomRef.current = configRef.current.digitalZoom;
      } else {
        // When turning on, establish auto-tracking baseline
        targetZoomRef.current = Math.max(1.35, configRef.current.digitalZoom);
        lastTargetSeenTimeRef.current = Date.now();
      }
      return { ...prev, isActive: nextActive };
    });
  }, []);

  // Set tracking mode ('digital' vs 'ptz' vs 'off')
  const setTrackingMode = useCallback((mode: TrackingMode) => {
    setTrackingState((prev) => {
      // If user requests PTZ but hardware is absent, keep digital
      const effectiveMode: TrackingMode =
        mode === 'ptz' && !configRef.current.hasPtzHardware ? 'digital' : mode;
      return { ...prev, mode: effectiveMode };
    });
  }, []);

  // Reset view to neutral default
  const resetView = useCallback(() => {
    targetOffsetXRef.current = 0;
    targetOffsetYRef.current = 0;
    targetZoomRef.current = 1.0;
    currentOffsetXRef.current = 0;
    currentOffsetYRef.current = 0;
    currentZoomRef.current = 1.0;
    smoothedFaceNormXRef.current = 0.5;
    smoothedFaceNormYRef.current = 0.5;

    const resetState: DigitalFramingState = {
      zoom: 1.0,
      offsetX: 0,
      offsetY: 0,
      autoFrame: true,
      targetZoom: 1.0,
      targetOffsetX: 0,
      targetOffsetY: 0,
    };
    publishedFramingRef.current = resetState;
    setFramingState(resetState);
  }, []);

  // Manual zoom adjustment
  const setManualZoom = useCallback((zoom: number) => {
    const clamped = Math.max(1.0, Math.min(4.0, zoom));
    targetZoomRef.current = clamped;
    if (!trackingState.isActive) {
      currentZoomRef.current = clamped;
    }
    setFramingState((prev) => ({
      ...prev,
      zoom: clamped,
      targetZoom: clamped,
    }));
  }, [trackingState.isActive]);

  // Update tracking target from current detected faces
  const updateTracking = useCallback(
    (faces: DetectedFace[]) => {
      const config = configRef.current;
      const video = videoRef.current;
      const now = Date.now();

      if (!video) return;

      const vw = video.videoWidth || video.clientWidth || 1280;
      const vh = video.videoHeight || video.clientHeight || 720;

      // Handle inactive or turned-off tracking
      if (!trackingState.isActive || trackingState.mode === 'off') {
        targetOffsetXRef.current = 0;
        targetOffsetYRef.current = 0;
        targetZoomRef.current = config.digitalZoom;
        return;
      }

      // 1. Handle no faces currently visible
      if (faces.length === 0) {
        const timeSinceLastSeen = now - lastTargetSeenTimeRef.current;
        // Hold framing position for 1200ms grace period to avoid jerkiness
        if (timeSinceLastSeen > 2000) {
          // After 2 seconds with no faces, smoothly decay back to center
          targetOffsetXRef.current = 0;
          targetOffsetYRef.current = 0;
          targetZoomRef.current = Math.max(1.0, config.digitalZoom);
        }
        return;
      }

      // 2. Resolve target face
      let targetFace: DetectedFace | undefined;

      // If user selected a specific face ID, check if it's visible
      if (trackingState.selectedFaceId) {
        targetFace = faces.find((f) => f.id === trackingState.selectedFaceId);
      }

      // If selected face not found or auto-mode, pick best face
      if (!targetFace && config.autoSwitch) {
        // Pick the largest/most prominent face (area = width * height)
        targetFace = faces.reduce((best, cur) => {
          const curArea = cur.boundingBox.width * cur.boundingBox.height;
          const bestArea = best.boundingBox.width * best.boundingBox.height;
          return curArea > bestArea ? cur : best;
        }, faces[0]);
      }

      if (!targetFace) {
        return;
      }

      lastTargetSeenTimeRef.current = now;
      lastTargetFaceIdRef.current = targetFace.id;

      // 3. Compute normalized coordinates (0..1)
      const normX = targetFace.centerX / vw;
      const normY = targetFace.centerY / vh;
      const normW = targetFace.boundingBox.width / vw;

      // Smooth face centroid position
      const centroidSpeed = Math.min(0.4, Math.max(0.04, config.speedFactor * 1.5));
      smoothedFaceNormXRef.current += (normX - smoothedFaceNormXRef.current) * centroidSpeed;
      smoothedFaceNormYRef.current += (normY - smoothedFaceNormYRef.current) * centroidSpeed;

      const sx = smoothedFaceNormXRef.current;
      const sy = smoothedFaceNormYRef.current;

      // 4. Compute framing offset to center face with natural headroom
      // Desired framing: horizontally centered (0.50), vertically slightly high (0.42) for natural headroom
      const desiredX = 0.5;
      const desiredY = 0.42;

      const deltaX = sx - desiredX;
      const deltaY = sy - desiredY;

      // Dead zone filter to eliminate micro-jitter while stationary
      const deadZoneRadius = (config.deadZonePercent / 100) * 0.35;
      const distFromDesired = Math.hypot(deltaX, deltaY);

      let rawOffX = 0;
      let rawOffY = 0;

      if (distFromDesired > deadZoneRadius) {
        // Translation in opposite direction centers the subject
        rawOffX = -deltaX * config.sensitivity;
        rawOffY = -deltaY * config.sensitivity;
      }

      // 5. Compute adaptive auto-framing zoom
      let autoZoom = Math.max(1.35, config.digitalZoom);
      if (config.autoFraming) {
        if (normW < 0.14) {
          // Subject is far away: gently zoom in up to 2.2x
          autoZoom = Math.min(2.2, Math.max(1.4, 0.22 / Math.max(0.07, normW)));
        } else if (normW > 0.32) {
          // Subject is very close: zoom out to 1.25x so head isn't cropped
          autoZoom = Math.max(1.25, Math.min(1.4, 0.22 / normW));
        }
      }
      targetZoomRef.current = Math.max(config.digitalZoom, autoZoom);

      // 6. Clamp translation offsets against safe sensor bounds
      // For transform: translate(tx%, ty%) scale(zoom)
      // Max safe translation before revealing canvas border is (zoom - 1) / 2
      const maxOffset = Math.max(0, (targetZoomRef.current - 1) / 2);
      targetOffsetXRef.current = Math.max(-maxOffset, Math.min(maxOffset, rawOffX));
      targetOffsetYRef.current = Math.max(-maxOffset, Math.min(maxOffset, rawOffY));
    },
    [trackingState.isActive, trackingState.mode, trackingState.selectedFaceId, videoRef]
  );

  // Continuous 60fps high-frequency animation / interpolation loop
  useEffect(() => {
    isMountedRef.current = true;

    const tick = () => {
      if (!isMountedRef.current) return;

      const config = configRef.current;
      // Exponential moving average factor scaled by speed setting
      const lerpFactor = Math.min(0.35, Math.max(0.03, config.speedFactor * 1.8));

      // Interpolate zoom
      const curZ = currentZoomRef.current;
      const tgtZ = targetZoomRef.current;
      const nextZ = curZ + (tgtZ - curZ) * lerpFactor;
      currentZoomRef.current = nextZ;

      // Re-clamp offsets against currently interpolated zoom
      const maxOffset = Math.max(0, (nextZ - 1) / 2);
      const clampedTargetX = Math.max(-maxOffset, Math.min(maxOffset, targetOffsetXRef.current));
      const clampedTargetY = Math.max(-maxOffset, Math.min(maxOffset, targetOffsetYRef.current));

      // Interpolate horizontal and vertical framing offsets
      const curX = currentOffsetXRef.current;
      const curY = currentOffsetYRef.current;
      const nextX = curX + (clampedTargetX - curX) * lerpFactor;
      const nextY = curY + (clampedTargetY - curY) * lerpFactor;
      currentOffsetXRef.current = nextX;
      currentOffsetYRef.current = nextY;

      // Throttle React state publication to avoid unnecessary React render thrashing
      const now = performance.now();
      const dz = Math.abs(nextZ - publishedFramingRef.current.zoom);
      const dx = Math.abs(nextX - publishedFramingRef.current.offsetX);
      const dy = Math.abs(nextY - publishedFramingRef.current.offsetY);

      if ((dz > 0.001 || dx > 0.001 || dy > 0.001) && now - lastUiPublishedTimeRef.current > 16) {
        lastUiPublishedTimeRef.current = now;
        const nextFraming: DigitalFramingState = {
          zoom: nextZ,
          offsetX: nextX,
          offsetY: nextY,
          autoFrame: config.autoFraming,
          targetZoom: tgtZ,
          targetOffsetX: clampedTargetX,
          targetOffsetY: clampedTargetY,
        };
        publishedFramingRef.current = nextFraming;
        setFramingState(nextFraming);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      isMountedRef.current = false;
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []);

  return {
    trackingState,
    framingState,
    selectFace,
    toggleTracking,
    setTrackingMode,
    resetView,
    setManualZoom,
    updateTracking,
  };
}
