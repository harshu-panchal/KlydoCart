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

        // Customize notification here
        const notificationTitle = payload.notification?.title || 'New Message';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: '/favicon.ico',
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Firebase wraps the data in FCM_MSG sometimes when auto-displaying notifications
    const data = event.notification.data?.FCM_MSG?.data || event.notification.data || {};
    const urlToOpen = data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window/tab open with the target URL
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window/tab is open, open the URL
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
