// Core types for AI Vision Pro

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  id: string;
  trackingId: number;
  boundingBox: BoundingBox;
  confidence: number;
  isSelected: boolean;
  centerX: number;
  centerY: number;
  lastSeen: number;
  framesSeen: number;
  expressions?: ExpressionData;
  landmarks?: FaceLandmark[];
}

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface ExpressionData {
  happy: number;
  sad: number;
  surprised: number;
  angry: number;
  neutral: number;
  disgusted: number;
  fearful: number;
  leftEyeBlink: number;
  rightEyeBlink: number;
  label: ExpressionLabel;
  confidence: number;
}

export type ExpressionLabel =
  | "Happy"
  | "Sad"
  | "Surprised"
  | "Angry"
  | "Neutral"
  | "Disgusted"
  | "Fearful"
  | "Uncertain";

export interface CameraInfo {
  deviceId: string;
  label: string;
  kind: "videoinput";
}

export interface PtzCapabilities {
  supported: boolean;
  pan?: boolean | { min: number; max: number; step: number };
  tilt?: boolean | { min: number; max: number; step: number };
  zoom?: boolean | { min: number; max: number; step: number };
}

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  resolution: { width: number; height: number } | null;
  frameRate: number | null;
  selectedDeviceId: string | null;
  availableDevices: CameraInfo[];
  facingMode: "user" | "environment";
  ptzCapabilities?: PtzCapabilities;
}

export interface DetectionState {
  isRunning: boolean;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  currentFaces: DetectedFace[];
  totalUniqueFaces: number;
  totalDetectionEvents: number;
  fps: number;
  lastError: string | null;
}

export type TrackingMode = "digital" | "ptz" | "off";

export interface TrackingState {
  mode: TrackingMode;
  isActive: boolean;
  selectedFaceId: string | null;
  targetPosition: { x: number; y: number } | null;
  smoothedPosition: { x: number; y: number } | null;
  deadZonePercent: number;
  speedFactor: number;
  sensitivity: number;
  autoSwitch: boolean;
  isLocked?: boolean;
}

export interface DigitalFramingState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  autoFrame: boolean;
  targetZoom: number;
  targetOffsetX: number;
  targetOffsetY: number;
}

export interface SessionEvent {
  id: string;
  timestamp: number;
  type: "face_detected" | "face_lost" | "session_start" | "session_end";
  faceCount: number;
  description: string;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  peakFaceCount: number;
  totalUniqueFaces: number;
  totalDetectionEvents: number;
  events: SessionEvent[];
}

export interface AppSettings {
  // Detection
  detectionConfidenceThreshold: number;
  detectionFps: number;
  showBoundingBoxes: boolean;
  showTrackingIds: boolean;
  showConfidence: boolean;
  showLandmarks: boolean;

  // Tracking
  trackingMode: TrackingMode;
  trackingSpeed: number;
  trackingSensitivity: number;
  trackingDeadZone: number;
  autoTrackSwitch: boolean;

  // Framing
  digitalZoom: number;
  autoFraming: boolean;

  // Expression analysis
  expressionAnalysis: boolean;

  // Privacy
  saveSessionHistory: boolean;
  maxSessionHistory: number;

  // Performance
  reducedEffects: boolean;

  // UI
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
}

export type SidebarPage =
  | "overview"
  | "camera"
  | "detection"
  | "tracking"
  | "expressions"
  | "analytics"
  | "history"
  | "settings";

export interface AppContextState {
  cameraState: CameraState;
  detectionState: DetectionState;
  trackingState: TrackingState;
  framingState: DigitalFramingState;
  settings: AppSettings;
  currentPage: SidebarPage;
  sessionHistory: SessionData[];
  currentSession: SessionData | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  detectionConfidenceThreshold: 0.5,
  detectionFps: 15,
  showBoundingBoxes: true,
  showTrackingIds: true,
  showConfidence: true,
  showLandmarks: false,
  trackingMode: "digital",
  trackingSpeed: 0.08,
  trackingSensitivity: 0.6,
  trackingDeadZone: 10,
  autoTrackSwitch: true,
  digitalZoom: 1.0,
  autoFraming: true,
  expressionAnalysis: true,
  saveSessionHistory: true,
  maxSessionHistory: 20,
  reducedEffects: false,
  theme: "light",
  sidebarCollapsed: false,
};
