import { messaging, getToken, onMessage } from '../firebase';
import api from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
const PERMISSION_DISMISSED_KEY = 'notification_permission_dismissed';

// Register service worker
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers are not supported in this browser.');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });
        console.log('✅ Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Checks the current notification permission status.
 * Returns 'granted' | 'denied' | 'default'
 * This does NOT prompt the user.
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Will NOT prompt if:
 *   - Notifications are not supported
 *   - Permission is already 'denied' (browser-level block — re-prompting is impossible)
 *   - Permission is already 'granted'
 * Returns true only if permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.info('[Notifications] Not supported in this browser.');
        return false;
    }

    const currentPermission = Notification.permission;

    // Already granted — no need to ask again
    if (currentPermission === 'granted') {
        return true;
    }

    // Already denied at browser level — we cannot prompt again; bail silently
    if (currentPermission === 'denied') {
        console.info('[Notifications] Permission is blocked at browser level. User must enable it manually via browser settings.');
        return false;
    }

    // 'default' — we can ask. But only ask once if user has previously dismissed.
    const wasDismissed = sessionStorage.getItem(PERMISSION_DISMISSED_KEY);
    if (wasDismissed) {
        console.info('[Notifications] Permission prompt was previously dismissed this session. Not asking again.');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Notification permission granted.');
            return true;
        } else {
            // User dismissed or denied the prompt this time
            sessionStorage.setItem(PERMISSION_DISMISSED_KEY, 'true');
            console.info('[Notifications] Permission not granted by user. Will not ask again this session.');
            return false;
        }
    } catch (err) {
        console.warn('[Notifications] Error requesting permission:', err);
        return false;
    }
}

// Get FCM token (only callable after permission is granted)
export async function getFCMToken(): Promise<string | null> {
    if (!messaging) return null;
    if (Notification.permission !== 'granted') return null;
    if (!VAPID_KEY) {
        console.warn('[FCM] VAPID key is missing. Cannot get FCM token.');
        return null;
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) return null;

        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ FCM Token obtained.');
            return token;
        } else {
            console.warn('[FCM] No token returned — check Firebase project configuration and VAPID key.');
            return null;
        }
    } catch (error: any) {
        // Suppress the error if it's just about missing permission (race condition)
        if (error?.code === 'messaging/permission-blocked' || error?.code === 'messaging/permission-default') {
            console.info('[FCM] Token not available — notifications not permitted.');
        } else {
            console.error('[FCM] Error getting token:', error?.message || error);
        }
        return null;
    }
}

/**
 * Full flow: check permission → request if needed → get token → register with backend.
 * Safe to call on every login. Will silently skip if permission is denied/blocked.
 */
export async function registerFCMToken(forceUpdate = false): Promise<string | null> {
    if (!messaging) return null;

    // Skip entirely if notifications are blocked — no point continuing
    if (Notification.permission === 'denied') {
        console.info('[FCM] Skipping registration — notification permission is blocked by browser.');
        return null;
    }

    try {
        // Check if already registered and no force update
        const savedToken = localStorage.getItem('fcm_token_web');
        if (savedToken && !forceUpdate) {
            console.info('[FCM] Token already registered.');
            return savedToken;
        }

        // Request permission (respects all guards — will not spam user)
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            return null;
        }

        // Get FCM token
        const token = await getFCMToken();
        if (!token) return null;

        // Detect platform
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const platform = isMobile ? 'mobile' : 'web';

        // Register with backend
        try {
            const response = await api.post('/fcm-tokens/save', { token, platform });
            if (response.data.success) {
                localStorage.setItem('fcm_token_web', token);
                console.log(`✅ FCM token registered with backend as [${platform}].`);
                return token;
            }
        } catch (apiError: any) {
            // Non-fatal: token is still usable even if backend save fails
            console.warn('[FCM] Failed to save token to backend:', apiError?.response?.data?.message || apiError?.message);
        }

        return token;
    } catch (error: any) {
        console.error('[FCM] Unexpected error in registerFCMToken:', error?.message || error);
        return null;
    }
}

// Setup foreground notification handler
export function setupForegroundNotificationHandler(handler?: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        if (handler) {
            handler(payload);
        }

        // Show system notification even in foreground if permission is granted
        if (Notification.permission === 'granted' && payload.notification) {
            const { title, body } = payload.notification;
            const notificationTitle = title || 'KlydoCart Notification';
            const notificationOptions: NotificationOptions = {
                body: body,
                icon: '/favicon.png',
                badge: '/favicon.png',
                tag: payload.data?.type || 'klydocart-general',
                data: payload.data
            };

            try {
                new Notification(notificationTitle, notificationOptions);
            } catch {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(notificationTitle, notificationOptions);
                });
            }
        }
    });
}

// Initialize push notifications (just registers service worker — no permission prompt here)
export async function initializePushNotifications() {
    if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
        console.warn('⚠️ Push notifications are not supported in this environment.');
        return;
    }

    if (!window.isSecureContext) {
        console.warn('[Push] Secure context required (HTTPS or localhost). Push notifications disabled.');
        return;
    }

    // Only register service worker here — do NOT ask for permission on app init
    await registerServiceWorker();
}
