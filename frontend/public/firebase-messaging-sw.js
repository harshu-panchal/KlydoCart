// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyC5S9ux3hbEWrTelwS_3Qjqu7RsA-TaamY",
    authDomain: "klydocart-3bc02.firebaseapp.com",
    projectId: "klydocart-3bc02",
    storageBucket: "klydocart-3bc02.firebasestorage.app",
    messagingSenderId: "246207647923",
    appId: "1:246207647923:web:4cf935ef4b16dc039560c6",
    measurementId: "G-YCRLB08H5K"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize messaging
let messaging;
try {
    messaging = firebase.messaging();
} catch (err) {
    console.error('Failed to initialize messaging in SW:', err);
}

if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);

        // Messages that carry a `notification` payload are displayed automatically
        // by the Firebase SDK — showing them again here creates duplicates.
        // Only display data-only messages manually (the backend sends data-only for web).
        if (payload.notification) {
            return;
        }

        const data = payload.data || {};
        const notificationTitle = data.title || 'KlydoCart Notification';
        const notificationOptions = {
            body: data.body || '',
            icon: '/favicon.png',
            badge: '/favicon.png',
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: true,
            silent: false,
            data: data
        };

        // Same tag + renotify: repeated sends for the same order replace the previous
        // banner and replay the system sound (the "ring" effect) instead of stacking.
        if (data.tag) {
            notificationOptions.tag = data.tag;
            notificationOptions.renotify = true;
        }

        self.registration.showNotification(notificationTitle, notificationOptions);

        // Bridge to open tabs: a service worker cannot play audio, but any open tab of
        // the site can. Tell every open tab about the push so the page can play the
        // real alert ringtone (mp3), which the OS notification sound can't provide.
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            clientList.forEach((client) => {
                client.postMessage({ type: 'KLYDO_PUSH_RECEIVED', data: data });
            });
        });
    });
}

// Handle notification click (fires for notifications we showed ourselves;
// SDK-displayed ones are handled by the SDK via webpush fcmOptions.link)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Firebase wraps the data in FCM_MSG sometimes when auto-displaying notifications
    const data = event.notification.data?.FCM_MSG?.data || event.notification.data || {};
    const urlToOpen = data?.link || '/';
    const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Prefer a tab already on our origin: focus it and navigate to the target page
            for (const client of clientList) {
                if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus().then((focusedClient) => {
                        if (focusedClient && 'navigate' in focusedClient && focusedClient.url !== absoluteUrl) {
                            return focusedClient.navigate(absoluteUrl).catch(() => focusedClient);
                        }
                        return focusedClient;
                    });
                }
            }
            // If no window/tab is open, open the URL
            if (clients.openWindow) {
                return clients.openWindow(absoluteUrl);
            }
        })
    );
});
