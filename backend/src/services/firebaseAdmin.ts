import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let isFirebaseInitialized = false;

try {
    let serviceAccount: any;

    // 1. Try config file from path (Priority)
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountPath = envPath
        ? path.resolve(process.cwd(), envPath)
        : path.resolve(__dirname, '../../config/firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        try {
            serviceAccount = require(serviceAccountPath);
            console.log('Firebase Admin initialized with service account file:', serviceAccountPath);
        } catch (err) {
            console.warn('Failed to parse service account file:', err);
        }
    }

    // 2. Fallback to Environment Variable
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT environment variable');
        } catch (err) {
            console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', err);
        }
    }

    // 3. Initialize if credentials found
    if (serviceAccount) {
        if (admin.apps.length === 0) {
            try {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                isFirebaseInitialized = true;
                console.log('✅ Firebase Admin SDK initialized successfully');
            } catch (initErr) {
                console.error('❌ Failed to initialize admin SDK:', initErr);
            }
        } else {
            isFirebaseInitialized = true;
        }
    } else {
        console.warn('⚠️ Firebase service account not found. Push notifications are disabled.');
    }

} catch (error) {
    console.error('CRITICAL: Error during Firebase initialization logic:', error);
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: { [key: string]: string };
    /**
     * Web notification tag. When set, repeated sends with the same tag replace the
     * previous notification and (with renotify) replay the system sound/vibration —
     * used to create a repeated "ring" effect for closed tabs.
     */
    webTag?: string;
}

/**
 * Remove tokens Firebase reported as invalid/unregistered from every user collection,
 * so future sends don't keep failing on them.
 */
async function pruneInvalidTokens(deadTokens: string[]): Promise<void> {
    if (!deadTokens || deadTokens.length === 0) return;
    // Lazy-require to avoid any load-order/circular issues at module init.
    const Delivery = (await import('../models/Delivery')).default;
    const Customer = (await import('../models/Customer')).default;
    const Seller = (await import('../models/Seller')).default;

    const pull = { $pull: { fcmTokens: { $in: deadTokens }, fcmTokenMobile: { $in: deadTokens } } } as any;
    await Promise.all([
        Delivery.updateMany({}, pull),
        Customer.updateMany({}, pull),
        Seller.updateMany({}, pull),
    ]);
    console.log(`🧹 Pruned ${deadTokens.length} invalid FCM token(s) from user records.`);
}

/**
 * Send push notification to multiple tokens
 */
export async function sendPushNotification(tokens: string[], payload: PushNotificationPayload) {
    if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

    if (!isFirebaseInitialized) {
        console.warn(`[${new Date().toISOString()}] Firebase not initialized. Cannot send to ${tokens.length} tokens.`);
        return { successCount: 0, failureCount: tokens.length };
    }

    try {
        // IMPORTANT: no top-level `notification` block. For web we send DATA-ONLY messages so
        // the Firebase SDK does NOT auto-display them — the SDK's auto-displayed notifications
        // swallow the click event (nothing opens, especially on http/localhost) and don't
        // reliably honor sound options. Instead our service worker (firebase-messaging-sw.js)
        // displays the notification itself from the data payload and handles clicks, which
        // works on both localhost and production.
        // Mobile still gets natively displayed notifications via the android/apns blocks below.
        const message: any = {
            data: {
                ...(payload.data || {}),
                // The service worker builds the visible notification from these:
                title: payload.title,
                body: payload.body,
                ...(payload.webTag ? { tag: payload.webTag } : {}),
            },
            tokens: tokens,
            // Web Push Specifics (crucial for waking up PWA/Browsers in sleep mode)
            webpush: {
                headers: {
                    Urgency: 'high'
                },
            },
            // Mobile Specifics
            android: {
                priority: 'high',
                notification: {
                    title: payload.title,
                    body: payload.body,
                    sound: 'default',
                    channelId: 'klydocart_notifications', // Ensure this matches your Flutter side channel if defined
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                    ...(payload.webTag ? { tag: payload.webTag } : {}),
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: payload.title,
                            body: payload.body,
                        },
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true,
                    },
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${new Date().toISOString()}] FCM Send to ${tokens.length} tokens: ${response.successCount} success, ${response.failureCount} failure`);

        // Prune dead/unregistered tokens so we stop retrying them every time (the main cause
        // of the "N failure" noise in the logs). Only remove tokens Firebase says are invalid.
        if (response.failureCount > 0) {
            const deadTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                const code = resp.error?.code;
                if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/invalid-argument'
                ) {
                    deadTokens.push(tokens[idx]);
                }
            });
            if (deadTokens.length > 0) {
                pruneInvalidTokens(deadTokens).catch((err) =>
                    console.error('Error pruning invalid FCM tokens:', err)
                );
            }
        }

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}
