const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true
});

const outputPath = path.join(__dirname, '../Delivery_App_Notifications_Report.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// --- Colors ---
const PRIMARY = '#1e1b4b';
const SECONDARY = '#312e81';
const ACCENT = '#4f46e5';
const TEXT_DARK = '#0f172a';
const TEXT_MUTED = '#475569';
const BG_CARD = '#f8fafc';
const BORDER_COLOR = '#cbd5e1';

// --- Header Banner ---
doc.rect(40, 40, 515, 75).fill(PRIMARY);
doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('KlydoCart — Delivery App Notifications', 55, 52);
doc.fontSize(11).font('Helvetica').text('Complete Technical Specification of Delivery Partner Notifications', 55, 76);
doc.fontSize(9).fillColor('#c7d2fe').text('Generated: August 6, 2026  |  Architecture: Socket.io + FCM + MongoDB', 55, 94);

doc.y = 130;

// --- Helper Functions ---
function drawSectionHeading(title) {
    if (doc.y > 700) doc.addPage();
    doc.moveDown(0.5);
    doc.fillColor(PRIMARY).fontSize(14).font('Helvetica-Bold').text(title);
    doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
    doc.moveDown(0.6);
}

function drawNotificationCard(title, badgeText, topic, trigger, payload, fcmPayload, sourceFile) {
    if (doc.y > 660) doc.addPage();
    
    const startY = doc.y;
    doc.rect(40, startY, 515, 115).fill(BG_CARD).strokeColor(BORDER_COLOR).lineWidth(0.8).stroke();
    doc.rect(40, startY, 4, 115).fill(ACCENT);
    
    // Title
    doc.fillColor(TEXT_DARK).fontSize(11).font('Helvetica-Bold').text(title, 52, startY + 8);
    // Badge
    doc.fillColor(PRIMARY).fontSize(8).font('Helvetica-Bold').text(`[ ${badgeText} ]`, 440, startY + 9, { align: 'right', width: 105 });
    
    // Content details
    let currY = startY + 26;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Event / Channel:', 52, currY);
    doc.font('Helvetica').fillColor(TEXT_DARK).text(topic, 135, currY);
    
    currY += 14;
    doc.font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Trigger Condition:', 52, currY);
    doc.font('Helvetica').fillColor(TEXT_DARK).text(trigger, 135, currY, { width: 410 });
    
    currY += 26;
    doc.font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Payload:', 52, currY);
    doc.font('Helvetica').fillColor(TEXT_DARK).text(payload, 135, currY, { width: 410 });

    if (fcmPayload) {
        currY += 14;
        doc.font('Helvetica-Bold').fillColor(TEXT_MUTED).text('FCM Push:', 52, currY);
        doc.font('Helvetica').fillColor(TEXT_DARK).text(fcmPayload, 135, currY, { width: 410 });
    }
    
    currY += 14;
    doc.font('Helvetica-Bold').fillColor(TEXT_MUTED).text('Source Code:', 52, currY);
    doc.font('Helvetica-Oblique').fillColor(SECONDARY).text(sourceFile, 135, currY);

    doc.y = startY + 123;
}

// --- Section 1: Overview ---
drawSectionHeading('1. Executive Overview');
doc.fontSize(9.5).font('Helvetica').fillColor(TEXT_DARK).text(
    'The KlydoCart Delivery Partner App utilizes a 3-tier hybrid notification architecture:\n' +
    '• Socket.io (Real-Time): Delivers instant sub-second order alerts, location updates, and claim/reject responses.\n' +
    '• FCM Admin SDK (Push Notifications): Reaches drivers when the device is locked or app is in background.\n' +
    '• In-App Persistent Feed (MongoDB): Stores immutable logs for system broadcasts, account status, and earnings.',
    { lineGap: 3 }
);

doc.moveDown(0.8);

// --- Section 2: Catalog ---
drawSectionHeading('2. Delivery Notification Catalog');

drawNotificationCard(
    '1. New Order Available Alert',
    'Socket + FCM Push',
    'new-order  |  Room: delivery-{deliveryBoyId}',
    'Customer order placed & accepted. Sent to active, online, non-busy drivers within seller service radius.',
    'orderId, orderNumber, customerName, customerPhone, deliveryAddress, total, subtotal, shipping',
    'Title: 🎁 New Order Available!  |  Body: New order #{orderNumber} for ₹{total}. Tap to view.',
    'backend/src/services/orderNotificationService.ts (line 327)'
);

drawNotificationCard(
    '2. New Return Pickup Request',
    'Socket + FCM Push',
    'NEW_RETURN_PICKUP  |  Room: delivery-{deliveryBoyId}',
    'Customer return request approved by seller/admin requiring pickup. Sent to non-busy nearby drivers.',
    'returnId, orderId, reason, quantity, storeName, pickupAddress, customerName, customerPhone',
    'Title: 🔄 New Return Pickup!  |  Body: New return pickup available at {storeName}. Tap to accept.',
    'backend/src/services/orderNotificationService.ts (line 916)'
);

drawNotificationCard(
    '3. Order Claimed by Another Driver',
    'Socket.io Only',
    'order-accepted  |  Room: delivery-{deliveryBoyId}',
    'Another delivery partner accepts the broadcasted order first. Automatically dismisses UI popup.',
    'orderId, acceptedBy',
    null,
    'backend/src/services/orderNotificationService.ts (line 561)'
);

drawNotificationCard(
    '4. Return Claimed by Another Driver',
    'Socket.io Only',
    'return-accepted  |  Room: delivery-{deliveryBoyId}',
    'Another delivery partner accepts the return task first. Clears return popup from UI queue.',
    'returnId, acceptedBy',
    null,
    'frontend/src/hooks/useDeliveryOrderNotifications.ts (line 207)'
);

drawNotificationCard(
    '5. Order Rejection Acknowledgment',
    'Socket.io Only',
    'order-rejection-acknowledged',
    'Current driver clicks "Reject" on order offer. System tracks rejections in-memory.',
    'orderId',
    null,
    'backend/src/services/orderNotificationService.ts (line 663)'
);

drawNotificationCard(
    '6. Seller Pickup Confirmation Alert',
    'Socket.io Only',
    'seller-pickup-confirmed  |  Room: order-{orderId}',
    'Driver confirms item pickup at seller location (verified via GPS proximity <= 500m).',
    'orderId, orderNumber, sellerId, sellerName, allPickedUp, newStatus',
    null,
    'backend/src/modules/delivery/controllers/deliveryOrderController.ts (line 761)'
);

drawNotificationCard(
    '7. All Sellers Picked Up Signal',
    'Socket.io Only',
    'all-sellers-picked-up  |  Room: delivery-{deliveryId}',
    'All seller items picked up. Order automatically transitions to Out for Delivery status.',
    'orderId, orderNumber, message',
    null,
    'backend/src/modules/delivery/controllers/deliveryOrderController.ts (line 771)'
);

drawNotificationCard(
    '8. Delivery OTP Sent Confirmation',
    'Socket.io + SMS',
    'otp-sent  |  Room: delivery-{deliveryId}',
    'Driver requests delivery OTP code upon arriving at customer location.',
    'orderId, orderNumber, message',
    null,
    'backend/src/modules/delivery/controllers/deliveryOrderController.ts (line 495)'
);

drawNotificationCard(
    '9. Order Delivered Confirmation',
    'Socket.io Only',
    'order-delivered  |  Room: delivery-{deliveryId}',
    'Delivery OTP verified successfully and order status updated to Delivered.',
    'orderId, orderNumber, message',
    null,
    'backend/src/modules/delivery/controllers/deliveryOrderController.ts (line 585)'
);

drawNotificationCard(
    '10. Auto-Release Task Reclaim',
    'Background Job',
    'releaseStaleAssignments  (Interval: 2 mins)',
    'Scans undelivered assignments idle > 45 mins. Unassigns driver, resets order status, & re-notifies nearby drivers.',
    'orderNumber, returnId, releaseReason',
    null,
    'backend/src/services/deliveryAutoReleaseService.ts (line 66)'
);

drawNotificationCard(
    '11. Reconnection Catch-Up Rescan',
    'Socket.io On-Connect',
    'join-delivery-notifications',
    'Triggered when driver opens app/reconnects. Rescans unassigned orders/returns created within last 30 mins.',
    'orderData / returnData',
    null,
    'backend/src/services/orderNotificationService.ts (line 687)'
);

drawNotificationCard(
    '12. In-App Feed Notifications',
    'REST API + DB',
    'recipientType: "Delivery"  |  GET /api/delivery/notifications',
    'Admin broadcasts, payment notifications, account verification alerts, and system warnings.',
    'title, message, type (Info/Success/Warning/Error/Order/Payment), priority, isRead',
    null,
    'backend/src/modules/delivery/controllers/deliveryNotificationController.ts'
);

// --- Master Table Page ---
doc.addPage();
drawSectionHeading('3. Master Delivery Notification Matrix');

const tableTop = doc.y + 5;
const headers = ['Event Name', 'Channel / Room', 'Transport', 'Source Reference'];
const colWidths = [120, 140, 95, 160];

// Draw Table Header
doc.rect(40, tableTop, 515, 20).fill(PRIMARY);
let xPos = 45;
doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
headers.forEach((h, i) => {
    doc.text(h, xPos, tableTop + 5, { width: colWidths[i] });
    xPos += colWidths[i];
});

const rows = [
    ['new-order', 'delivery-{deliveryBoyId}', 'Socket.io + FCM', 'orderNotificationService.ts:327'],
    ['NEW_RETURN_PICKUP', 'delivery-{deliveryBoyId}', 'Socket.io + FCM', 'orderNotificationService.ts:916'],
    ['order-accepted', 'delivery-{deliveryBoyId}', 'Socket.io', 'orderNotificationService.ts:561'],
    ['return-accepted', 'delivery-{deliveryBoyId}', 'Socket.io', 'useDeliveryOrderNotifications.ts:207'],
    ['order-rejection-ack', 'Direct Socket', 'Socket.io', 'orderNotificationService.ts:663'],
    ['seller-pickup-confirmed', 'order-{orderId}', 'Socket.io', 'deliveryOrderController.ts:761'],
    ['all-sellers-picked-up', 'delivery-{deliveryId}', 'Socket.io', 'deliveryOrderController.ts:771'],
    ['otp-sent', 'delivery-{deliveryId}', 'Socket.io + SMS', 'deliveryOrderController.ts:495'],
    ['order-delivered', 'delivery-{deliveryId}', 'Socket.io', 'deliveryOrderController.ts:585'],
    ['releaseStaleAssignments', 'Background Cron', 'DB / System', 'deliveryAutoReleaseService.ts:66'],
    ['scanOrdersForDeliveryBoy', 'delivery-{deliveryBoyId}', 'Socket.io Rescan', 'orderNotificationService.ts:687'],
    ['In-App Feed API', 'GET /api/delivery/notif', 'REST / MongoDB', 'deliveryNotificationController.ts:10']
];

let rY = tableTop + 20;
rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
        doc.rect(40, rY, 515, 18).fill('#f1f5f9');
    }
    doc.strokeColor(BORDER_COLOR).lineWidth(0.5).rect(40, rY, 515, 18).stroke();
    
    xPos = 45;
    doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_DARK);
    row.forEach((cell, i) => {
        if (i === 0) doc.font('Helvetica-Bold');
        else doc.font('Helvetica');
        doc.text(cell, xPos, rY + 4, { width: colWidths[i] - 5 });
        xPos += colWidths[i];
    });
    rY += 18;
});

// Footer page numbers
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor(TEXT_MUTED).text(
        `Klydocart Delivery App Notification Report  |  Page ${i + 1} of ${pages.count}`,
        40,
        800,
        { align: 'center', width: 515 }
    );
}

doc.end();

stream.on('finish', () => {
    console.log('✅ PDF generated successfully at:', outputPath);
});
