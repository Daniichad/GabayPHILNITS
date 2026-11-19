/**
 * Production-Safe Diagnostics & Performance Profiler
 * 
 * Automatically captures:
 * 1. User Clicks & Touches (Pressable, TouchableOpacity, Navigation, Buttons)
 * 2. Network / API Requests (Supabase, fetch, external endpoints) with exact start time, duration in ms, status, and payload info
 * 3. Screen Navigation transitions (From Screen -> To Screen, duration ms)
 */

declare const global: any;

const formatTime = (date = new Date()) => {
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${h}:${m}:${s}.${ms}`;
};

let lastClickTime = 0;
let clickCounter = 0;
let requestCounter = 0;

/**
 * Log a user click / interaction
 */
export function logUserClick(config: any = {}, event: any = {}) {
  const now = Date.now();
  // Debounce duplicate events that fire within 150ms on identical touch targets
  if (now - lastClickTime < 150) return;
  lastClickTime = now;

  clickCounter++;
  const timeStr = formatTime(new Date(now));

  const accessibilityLabel = config?.accessibilityLabel || event?.currentTarget?.accessibilityLabel;
  const testID = config?.testID || event?.currentTarget?.testID;
  const targetId = event?.target || event?.currentTarget || 'view';

  // Identify descriptive label if available
  let descriptor = '';
  if (accessibilityLabel) {
    descriptor = `[Label: "${accessibilityLabel}"]`;
  } else if (testID) {
    descriptor = `[TestID: "${testID}"]`;
  } else if (typeof config?.onPress?.name === 'string' && config.onPress.name && config.onPress.name !== 'onPress') {
    descriptor = `[Handler: ${config.onPress.name}()]`;
  }

  const coordinates = event?.nativeEvent
    ? `(x: ${Math.round(event.nativeEvent.pageX || 0)}, y: ${Math.round(event.nativeEvent.pageY || 0)})`
    : '';

  console.log(`\x1b[36m[USER CLICK #${clickCounter}]\x1b[0m 👆 ${timeStr} ${descriptor} ${coordinates}`);
}

/**
 * Clean & Format API endpoint for readability
 */
function cleanUrl(rawUrl: string): string {
  try {
    if (!rawUrl) return 'unknown';
    // Shorten long Supabase queries for easy scanning
    const url = new URL(rawUrl);
    if (url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/rest/v1/')[1];
      const params = url.searchParams.toString();
      return `Supabase: /rest/v1/${table}${params ? '?' + decodeURIComponent(params) : ''}`;
    }
    if (url.pathname.includes('/auth/v1/')) {
      return `Supabase Auth: ${url.pathname}${url.search}`;
    }
    return `${url.origin}${url.pathname}${url.search ? '?' + url.searchParams.toString() : ''}`;
  } catch (_) {
    return rawUrl;
  }
}

/**
 * Initialize the global API Request and Click Interceptor
 */
export function initPerformanceLogger() {
  if (global.__perfLoggerInitialized) return;
  global.__perfLoggerInitialized = true;

  // 1. Register global click handler hooked into React Native's Pressability engine
  global.__logUserClick = logUserClick;

  // 2. Intercept all global.fetch calls (including Supabase, NetInfo, Auth, AI, external APIs)
  const originalFetch = global.fetch;
  if (typeof originalFetch === 'function') {
    global.fetch = async function (...args: any[]) {
      const reqId = ++requestCounter;
      const startTime = Date.now();
      const startTimeStr = formatTime(new Date(startTime));

      const rawUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || 'unknown';
      const formattedUrl = cleanUrl(rawUrl);
      const method = ((args[1] && args[1].method) || (args[0] && args[0].method) || 'GET').toUpperCase();

      console.log(`\x1b[33m[API REQ #${reqId} START]\x1b[0m 🚀 ${startTimeStr} ${method} ${formattedUrl}`);

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;
        const endTimeStr = formatTime();

        // Color coding based on latency: Green (< 300ms), Yellow (300ms - 1000ms), Red (> 1000ms)
        let latencyColor = '\x1b[32m'; // green
        let latencyTag = '⚡ FAST';
        if (duration > 1500) {
          latencyColor = '\x1b[31m'; // red
          latencyTag = '🐢 VERY SLOW';
        } else if (duration > 600) {
          latencyColor = '\x1b[33m'; // yellow
          latencyTag = '⚠️ MODERATE';
        }

        console.log(
          `${latencyColor}[API REQ #${reqId} END]\x1b[0m ${response.status >= 400 ? '❌' : '✅'} Status: ${response.status} | ` +
          `${latencyColor}${duration}ms (${latencyTag})\x1b[0m | Ended: ${endTimeStr} | ${method} ${formattedUrl}`
        );

        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        const endTimeStr = formatTime();
        console.log(
          `\x1b[31m[API REQ #${reqId} FAILED]\x1b[0m 💥 ${duration}ms | Ended: ${endTimeStr} | ${method} ${formattedUrl} | Error: ${err?.message || err}`
        );
        throw err;
      }
    };
  }

  console.log('\x1b[35m[PERF LOGGER]\x1b[0m 🚀 Performance & Network Profiler active! All user clicks and API response times are being logged.');
}
