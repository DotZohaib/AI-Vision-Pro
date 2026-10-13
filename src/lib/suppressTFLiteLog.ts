'use client';

/**
 * Intercepts informational stderr messages emitted by TensorFlow Lite / Emscripten WASM.
 *
 * MediaPipe Tasks Vision WebAssembly outputs informational initialization notes (such as
 * "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") via POSIX fd 2 (stderr).
 * Emscripten's default runtime maps stderr to `console.error`.
 *
 * In Next.js 16 development mode, `console.error` calls are intercepted by the dev error
 * overlay and displayed as unhandled runtime errors with call stacks pointing to the
 * enclosing callback (`runDetectionFrame` / `startDetection`).
 *
 * This handler routes genuine TFLite INFO messages to `console.info`, preserving developer
 * visibility in browser DevTools while preventing false-positive Next.js error overlays.
 */

if (typeof window !== 'undefined' && !(window as unknown as { __tflite_interceptor_installed?: boolean }).__tflite_interceptor_installed) {
  (window as unknown as { __tflite_interceptor_installed?: boolean }).__tflite_interceptor_installed = true;

  const originalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (
      first.includes('Created TensorFlow Lite XNNPACK delegate') ||
      first.startsWith('INFO:') ||
      first.includes('xnnpack_delegate.cc') ||
      (first.includes('TensorFlow Lite') && (first.includes('delegate') || first.includes('XNNPACK')))
    ) {
      console.info('[TFLite WASM Engine]', ...args);
      return;
    }

    originalConsoleError(...args);
  };
}
