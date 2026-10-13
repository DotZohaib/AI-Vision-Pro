'use client';

import '@/lib/suppressTFLiteLog';
import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  DetectedFace,
  DetectionState,
  ExpressionData,
  ExpressionLabel,
  FaceLandmark,
} from '@/types';

let faceDetectionModule: typeof import('@mediapipe/tasks-vision') | null = null;
let visionResolver: Parameters<typeof import('@mediapipe/tasks-vision').FaceDetector.createFromOptions>[0] | null = null;
let faceDetector: import('@mediapipe/tasks-vision').FaceDetector | null = null;
let faceLandmarker: import('@mediapipe/tasks-vision').FaceLandmarker | null = null;

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

let nextTrackingId = 1;
const faceRegistry = new Map<
  string,
  { trackingId: number; lastBox: Box; lastSeen: number }
>();
const IOU_THRESHOLD = 0.3;
const EXPIRY_MS = 1500;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BlendshapeItem {
  score: number;
  categoryName: string;
}

function computeIoU(a: Box, b: Box) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);
  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  if (interArea === 0) return 0;
  const aArea = a.w * a.h;
  const bArea = b.w * b.h;
  return interArea / (aArea + bArea - interArea);
}

function classifyExpression(blendshapes: BlendshapeItem[]): ExpressionData {
  const get = (name: string) =>
    blendshapes.find((b) => b.categoryName === name)?.score ?? 0;

  const happy = Math.min(
    1,
    get('mouthSmileLeft') * 0.5 +
      get('mouthSmileRight') * 0.5 +
      get('cheekSquintLeft') * 0.3 +
      get('cheekSquintRight') * 0.3
  );
  const sad = Math.min(
    1,
    get('mouthFrownLeft') * 0.5 + get('mouthFrownRight') * 0.5 + get('browInnerUp') * 0.3
  );
  const surprised = Math.min(
    1,
    get('jawOpen') * 0.4 + get('browOuterUpLeft') * 0.3 + get('browOuterUpRight') * 0.3
  );
  const angry = Math.min(
    1,
    get('browDownLeft') * 0.4 +
      get('browDownRight') * 0.4 +
      get('noseSneerLeft') * 0.1 +
      get('noseSneerRight') * 0.1
  );
  const disgusted = Math.min(
    1,
    get('noseSneerLeft') * 0.5 + get('noseSneerRight') * 0.5
  );
  const fearful = Math.min(
    1,
    get('browInnerUp') * 0.4 + get('eyeWideLeft') * 0.3 + get('eyeWideRight') * 0.3
  );
  const leftEyeBlink = get('eyeBlinkLeft');
  const rightEyeBlink = get('eyeBlinkRight');

  const expressions = { happy, sad, surprised, angry, disgusted, fearful };
  const maxKey = Object.entries(expressions).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];
  const maxVal = expressions[maxKey as keyof typeof expressions];
  const neutral = 1 - maxVal;

  let label: ExpressionLabel = 'Neutral';
  if (maxVal > 0.35) {
    const map: Record<string, ExpressionLabel> = {
      happy: 'Happy',
      sad: 'Sad',
      surprised: 'Surprised',
      angry: 'Angry',
      disgusted: 'Disgusted',
      fearful: 'Fearful',
    };
    label = map[maxKey] ?? 'Uncertain';
  } else if (maxVal < 0.15) {
    label = 'Uncertain';
  }

  return {
    happy,
    sad,
    surprised,
    angry,
    neutral,
    disgusted,
    fearful,
    leftEyeBlink,
    rightEyeBlink,
    label,
    confidence: maxVal > 0.2 ? maxVal : 0,
  };
}

function safeGenerateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return 'face_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export interface DetectionSettings {
  detectionFps: number;
  confidenceThreshold: number;
  showBoundingBoxes: boolean;
  showTrackingIds: boolean;
  showConfidence: boolean;
  showLandmarks: boolean;
  expressionAnalysis: boolean;
}

const INITIAL_STATE: DetectionState = {
  isRunning: false,
  isModelLoaded: false,
  isModelLoading: false,
  currentFaces: [],
  totalUniqueFaces: 0,
  totalDetectionEvents: 0,
  fps: 0,
  lastError: null,
};

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean,
  settings: DetectionSettings,
  onFacesDetected?: (faces: DetectedFace[]) => void
) {
  const [detectionState, setDetectionState] = useState<DetectionState>(INITIAL_STATE);

  const settingsRef = useRef<DetectionSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const onFacesDetectedRef = useRef(onFacesDetected);
  useEffect(() => {
    onFacesDetectedRef.current = onFacesDetected;
  }, [onFacesDetected]);

  const animFrameRef = useRef<number | null>(null);
  const lastInferenceRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const lastFaceCountRef = useRef<number>(-1);
  const fpsCounterRef = useRef<{ frames: number; time: number }>({ frames: 0, time: 0 });
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(isActive);
  const uniqueFaceCountRef = useRef(0);
  const totalEventsRef = useRef(0);
  const selectedFaceIdRef = useRef<string | null>(null);
  const modelLoadingRef = useRef(false);
  const lastTimestampRef = useRef<number>(0);
  const isInferenceRunningRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);

  // Load models with GPU -> CPU fallback for robust browser & mobile support
  const loadModels = useCallback(async (): Promise<boolean> => {
    if (faceDetector) return true;
    if (modelLoadingRef.current) return false;
    modelLoadingRef.current = true;

    setDetectionState((prev) => ({ ...prev, isModelLoading: true, lastError: null }));

    try {
      if (!faceDetectionModule) {
        faceDetectionModule = await import('@mediapipe/tasks-vision');
      }

      const { FaceDetector, FaceLandmarker, FilesetResolver } = faceDetectionModule;
      if (!visionResolver) {
        visionResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      }

      // Create FaceDetector (GPU first, fallback to CPU)
      try {
        faceDetector = await FaceDetector.createFromOptions(visionResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.35,
          minSuppressionThreshold: 0.3,
        });
      } catch {
        faceDetector = await FaceDetector.createFromOptions(visionResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.35,
          minSuppressionThreshold: 0.3,
        });
      }

      // Create FaceLandmarker optionally (GPU first, fallback CPU, graceful continue if unavailable)
      try {
        faceLandmarker = await FaceLandmarker.createFromOptions(visionResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 4,
          minFaceDetectionConfidence: 0.35,
          minFacePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
      } catch {
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 4,
            minFaceDetectionConfidence: 0.35,
            minFacePresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
          });
        } catch {
          // Continue without Landmarker if memory restricted
          faceLandmarker = null;
        }
      }

      modelLoadingRef.current = false;
      if (isMountedRef.current) {
        setDetectionState((prev) => ({
          ...prev,
          isModelLoaded: true,
          isModelLoading: false,
          lastError: null,
        }));
      }
      return true;
    } catch (err) {
      modelLoadingRef.current = false;
      const msg = err instanceof Error ? err.message : 'Model initialization failed';
      if (isMountedRef.current) {
        setDetectionState((prev) => ({
          ...prev,
          isModelLoading: false,
          lastError: `AI Vision initialization note: ${msg}`,
        }));
      }
      return false;
    }
  }, []);

  const runFrameRef = useRef<() => void>(() => {});

  const runDetectionFrame = useCallback(() => {
    if (!isMountedRef.current || !isActiveRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Validate video element readiness
    if (
      !video ||
      !canvas ||
      video.readyState < 2 ||
      video.paused ||
      video.ended ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      animFrameRef.current = requestAnimationFrame(() => runFrameRef.current());
      return;
    }

    const now = performance.now();
    const s = settingsRef.current;
    const interval = 1000 / Math.max(1, s.detectionFps);

    // Throttle inference to desired FPS
    if (now - lastInferenceRef.current < interval) {
      animFrameRef.current = requestAnimationFrame(() => runFrameRef.current());
      return;
    }
    lastInferenceRef.current = now;

    // Concurrency guard: avoid calling detectForVideo while previous inference is still executing
    if (isInferenceRunningRef.current) {
      animFrameRef.current = requestAnimationFrame(() => runFrameRef.current());
      return;
    }
    isInferenceRunningRef.current = true;

    // FPS calculation
    fpsCounterRef.current.frames++;
    if (now - fpsCounterRef.current.time > 1000) {
      const currentFps = Math.round(
        (fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.time)
      );
      fpsCounterRef.current = { frames: 0, time: now };
      if (isMountedRef.current) {
        setDetectionState((prev) => ({ ...prev, fps: currentFps }));
      }
    }

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      // Guarantee strictly monotonically increasing timestamp for MediaPipe Video mode
      const roundedNow = Math.round(now);
      const timestamp = Math.max(roundedNow, (lastTimestampRef.current || 0) + 1);
      lastTimestampRef.current = timestamp;

      let detectedBoxes: Array<Box & { confidence: number }> = [];
      let blendshapesByFace: BlendshapeItem[][] = [];
      let landmarksByFace: FaceLandmark[][] = [];

      // Run FaceDetector
      if (faceDetector) {
        const result = faceDetector.detectForVideo(video, timestamp);
        detectedBoxes = (result.detections ?? [])
          .filter((d) => (d.categories?.[0]?.score ?? 0) >= s.confidenceThreshold)
          .map((d) => {
            const bb = d.boundingBox!;
            return {
              x: bb.originX / vw,
              y: bb.originY / vh,
              w: bb.width / vw,
              h: bb.height / vh,
              confidence: d.categories?.[0]?.score ?? 0,
            };
          });
      }

      // Expressions and Landmarks from FaceLandmarker
      if (faceLandmarker && detectedBoxes.length > 0 && (s.expressionAnalysis || s.showLandmarks)) {
        try {
          const lmResult = faceLandmarker.detectForVideo(video, timestamp);
          blendshapesByFace = (lmResult.faceBlendshapes ?? []).map(
            (cls) => cls.categories as BlendshapeItem[]
          );
          if (lmResult.faceLandmarks) {
            landmarksByFace = lmResult.faceLandmarks.map((lm) =>
              lm.map((pt) => ({ x: pt.x * vw, y: pt.y * vh, z: pt.z }))
            );
          }
        } catch {
          blendshapesByFace = [];
          landmarksByFace = [];
        }
      }

      // Expire old tracking IDs
      const nowMs = Date.now();
      for (const [id, entry] of faceRegistry) {
        if (nowMs - entry.lastSeen > EXPIRY_MS) {
          faceRegistry.delete(id);
        }
      }

      // Match detections to registry using IoU
      const currentFaces: DetectedFace[] = [];
      const usedIds = new Set<string>();

      for (let i = 0; i < detectedBoxes.length; i++) {
        const box = detectedBoxes[i];
        let bestId: string | null = null;
        let bestIoU = 0;

        for (const [id, entry] of faceRegistry) {
          if (usedIds.has(id)) continue;
          const iou = computeIoU(box, entry.lastBox);
          if (iou > bestIoU) {
            bestIoU = iou;
            bestId = id;
          }
        }

        let trackingId: number;
        let id: string;

        if (bestId && bestIoU >= IOU_THRESHOLD) {
          id = bestId;
          trackingId = faceRegistry.get(id)!.trackingId;
          faceRegistry.get(id)!.lastBox = box;
          faceRegistry.get(id)!.lastSeen = nowMs;
          usedIds.add(id);
        } else {
          id = safeGenerateId();
          trackingId = nextTrackingId++;
          uniqueFaceCountRef.current++;
          totalEventsRef.current++;
          faceRegistry.set(id, { trackingId, lastBox: box, lastSeen: nowMs });
          usedIds.add(id);
        }

        const expression = blendshapesByFace[i]
          ? classifyExpression(blendshapesByFace[i])
          : undefined;

        currentFaces.push({
          id,
          trackingId,
          boundingBox: {
            x: box.x * vw,
            y: box.y * vh,
            width: box.w * vw,
            height: box.h * vh,
          },
          confidence: box.confidence,
          isSelected: id === selectedFaceIdRef.current,
          centerX: (box.x + box.w / 2) * vw,
          centerY: (box.y + box.h / 2) * vh,
          lastSeen: nowMs,
          framesSeen: 1,
          expressions: expression,
          landmarks: landmarksByFace[i],
        });
      }

      // Draw clean professional canvas annotations
      ctx.clearRect(0, 0, vw, vh);

      if (s.showBoundingBoxes && currentFaces.length > 0) {
        currentFaces.forEach((face) => {
          const { x, y, width, height } = face.boundingBox;
          const isSelected = face.isSelected || currentFaces.length === 1;
          const primaryColor = isSelected ? '#2563eb' : '#0284c7';
          const secondaryBadge = isSelected ? '#16a34a' : '#0f172a';

          ctx.save();

          // Clean bounding box
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = isSelected ? 2.5 : 1.75;
          ctx.strokeRect(x, y, width, height);

          // Corner brackets
          const cornerLen = Math.min(width, height) * 0.16;
          ctx.lineWidth = isSelected ? 3.5 : 2.5;
          ctx.strokeStyle = isSelected ? '#1d4ed8' : '#0369a1';
          ctx.beginPath();
          // Top-left
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          // Top-right
          ctx.moveTo(x + width - cornerLen, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLen);
          // Bottom-left
          ctx.moveTo(x, y + height - cornerLen);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerLen, y + height);
          // Bottom-right
          ctx.moveTo(x + width - cornerLen, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerLen);
          ctx.stroke();

          // Optional subtle landmarks
          if (s.showLandmarks && face.landmarks) {
            ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
            face.landmarks.forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.2, 0, 2 * Math.PI);
              ctx.fill();
            });
          }

          // Clean Pill Badge
          if (s.showTrackingIds) {
            const idLabel = `Face ${String(face.trackingId).padStart(2, '0')}`;
            const confLabel = s.showConfidence
              ? ` • ${Math.round(face.confidence * 100)}%`
              : '';
            const badgeText = `${idLabel}${confLabel}`;

            ctx.font = '600 12px system-ui, -apple-system, sans-serif';
            const badgeW = ctx.measureText(badgeText).width + 12;
            const badgeH = 22;
            const badgeY = Math.max(4, y - badgeH - 4);

            // Rounded badge background
            ctx.fillStyle = secondaryBadge;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(x, badgeY, badgeW, badgeH, 4);
            } else {
              ctx.rect(x, badgeY, badgeW, badgeH);
            }
            ctx.fill();

            // Badge text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(badgeText, x + 6, badgeY + 15);

            // Expression pill if available
            if (s.expressionAnalysis && face.expressions && face.expressions.label !== 'Uncertain') {
              const expLabel = `${face.expressions.label} (${Math.round(face.expressions.confidence * 100)}%)`;
              ctx.font = '500 11px system-ui, -apple-system, sans-serif';
              const expW = ctx.measureText(expLabel).width + 10;
              const expH = 20;
              const expY = y + height + 4;

              ctx.fillStyle = '#2563eb';
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, expY, expW, expH, 4);
              } else {
                ctx.rect(x, expY, expW, expH);
              }
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.fillText(expLabel, x + 5, expY + 14);
            }
          }

          ctx.restore();
        });
      }

      // Synchronously notify tracking system for immediate real-time framing
      if (onFacesDetectedRef.current) {
        onFacesDetectedRef.current(currentFaces);
      }

      // Throttled UI state sync (prevents heavy React re-render cascades at 30fps)
      const countChanged = currentFaces.length !== lastFaceCountRef.current;
      const throttleElapsed = now - lastUiUpdateRef.current > 150;

      if ((countChanged || throttleElapsed) && isMountedRef.current) {
        lastUiUpdateRef.current = now;
        lastFaceCountCountRef: lastFaceCountRef.current = currentFaces.length;
        setDetectionState((prev) => ({
          ...prev,
          isRunning: true,
          currentFaces,
          totalUniqueFaces: uniqueFaceCountRef.current,
          totalDetectionEvents: totalEventsRef.current,
        }));
      }

      consecutiveErrorsRef.current = 0;
    } catch (err) {
      consecutiveErrorsRef.current++;
      if (consecutiveErrorsRef.current > 40) {
        const msg = err instanceof Error ? err.message : 'Inference error';
        if (isMountedRef.current) {
          setDetectionState((prev) => ({
            ...prev,
            isRunning: false,
            lastError: `Face detection paused after repeated frame errors: ${msg}`,
          }));
        }
        return;
      }
    } finally {
      isInferenceRunningRef.current = false;
    }

    if (isMountedRef.current && isActiveRef.current) {
      animFrameRef.current = requestAnimationFrame(() => runFrameRef.current());
    }
  }, [canvasRef, videoRef]);

  // Sync animation loop reference
  useEffect(() => {
    runFrameRef.current = runDetectionFrame;
  }, [runDetectionFrame]);

  const stopDetection = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isInferenceRunningRef.current = false;
    lastFaceCountRef.current = 0;
    setDetectionState((prev) => ({ ...prev, isRunning: false, currentFaces: [] }));
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef]);

  const startDetection = useCallback(async () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const ok = await loadModels();
    if (!ok || !isMountedRef.current) return;

    faceRegistry.clear();
    lastTimestampRef.current = 0;
    consecutiveErrorsRef.current = 0;
    uniqueFaceCountRef.current = 0;
    totalEventsRef.current = 0;
    nextTrackingId = 1;

    setDetectionState((prev) => ({
      ...prev,
      isRunning: true,
      currentFaces: [],
      totalUniqueFaces: 0,
      totalDetectionEvents: 0,
      lastError: null,
    }));

    animFrameRef.current = requestAnimationFrame(() => runFrameRef.current());
  }, [loadModels]);

  const selectFace = useCallback((faceId: string | null) => {
    selectedFaceIdRef.current = faceId;
  }, []);

  // React to camera active state using deferred execution
  useEffect(() => {
    isActiveRef.current = isActive;
    const timer = setTimeout(() => {
      if (isActive) {
        void startDetection();
      } else {
        stopDetection();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isActive, startDetection, stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const anim = animFrameRef.current;
      if (anim !== null) cancelAnimationFrame(anim);
      isInferenceRunningRef.current = false;
    };
  }, []);

  return { detectionState, startDetection, stopDetection, selectFace, loadModels };
}
