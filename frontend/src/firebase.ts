import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let messaging: Messaging | null = null;

/**
 * Safely retrieves or initializes the Firebase Messaging instance.
 * Checks `isSupported()` to prevent throwing errors in unsupported environments.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
    if (messaging) return messaging;
    if (typeof window === 'undefined') return null;

    try {
        const supported = await isSupported();
        if (supported) {
            messaging = getMessaging(app);
            return messaging;
        } else {
            console.warn('[Firebase] Push Messaging is not supported in this browser environment.');
        }
    } catch (error: any) {
        console.warn('[Firebase] Failed to initialize Firebase Messaging:', error?.message || error);
    }
    return null;
}

// Attempt initial synchronous setup if supported
isSupported().then((supported) => {
    if (supported) {
        try {
            messaging = getMessaging(app);
        } catch {
            // Ignore error here; getMessagingInstance() will retry on demand
        }
    }
}).catch(() => {});

export { messaging, getToken, onMessage };
export default app;
