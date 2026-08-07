# KlydoCart — Delivery App Notification Architecture & Technical Report

**Application:** KlydoCart Delivery Partner Module  
**Date:** August 6, 2026  
**Architecture:** Socket.io + FCM Admin SDK + MongoDB + REST  

---

## 1. Executive Summary & Transport Architecture

The KlydoCart Delivery Partner App utilizes a **3-tier hybrid notification engine**:

1. **Real-Time WebSockets (Socket.io)**: Delivers sub-second order alerts, driver location streaming, and acceptance/rejection responses while the driver is actively using the app.
2. **Push Notifications (FCM Admin SDK)**: Reaches offline drivers when the device is locked, browser tab closed, or app running in background via high-priority FCM data payloads.
3. **In-App Persistent Feed (MongoDB)**: Stores immutable logs for system broadcasts, account verification alerts, earnings notifications, and administrative updates.

---

## 2. Complete Breakdown of Delivery Notification Types

### 1. New Order Available Alert (`new-order`)
* **Transport:** Socket.io + FCM Push Notification
* **Target Room:** `delivery-{deliveryBoyId}`
* **Trigger Condition:** Customer order placed & accepted. Sent to active, online, non-busy drivers within seller service radius.
* **Payload:** `orderId`, `orderNumber`, `customerName`, `customerPhone`, `deliveryAddress`, `total`, `subtotal`, `shipping`, `createdAt`
* **FCM Push Payload:**
  * **Title:** 🎁 New Order Available!
  * **Body:** New order #{orderNumber} for ₹{total}. Tap to view details and accept.
* **Source Code:** `backend/src/services/orderNotificationService.ts` (line 327)

---

### 2. New Return Pickup Request (`NEW_RETURN_PICKUP`)
* **Transport:** Socket.io + FCM Push Notification
* **Target Room:** `delivery-{deliveryBoyId}`
* **Trigger Condition:** Customer return request approved by seller/admin requiring product pickup. Sent to non-busy nearby drivers.
* **Payload:** `returnId`, `orderId`, `reason`, `quantity`, `storeName`, `pickupAddress`, `customerName`, `customerPhone`, `customerAddress`
* **FCM Push Payload:**
  * **Title:** 🔄 New Return Pickup!
  * **Body:** New return pickup available at {storeName}. Tap to accept.
* **Source Code:** `backend/src/services/orderNotificationService.ts` (line 916)

---

### 3. Order Claimed by Another Driver (`order-accepted`)
* **Transport:** Socket.io Only
* **Target Room:** `delivery-{deliveryBoyId}`
* **Trigger Condition:** Another delivery partner accepts the broadcasted order first.
* **Frontend Action:** Automatically clears the offer popup card from all other drivers' screens without error.
* **Source Code:** `backend/src/services/orderNotificationService.ts` (line 561)

---

### 4. Return Claimed by Another Driver (`return-accepted`)
* **Transport:** Socket.io Only
* **Target Room:** `delivery-{deliveryBoyId}`
* **Trigger Condition:** Another delivery partner accepts the return task first. Clears return popup from UI queue.
* **Source Code:** `frontend/src/hooks/useDeliveryOrderNotifications.ts` (line 207)

---

### 5. Order Rejection Acknowledgment (`order-rejection-acknowledged`)
* **Transport:** Socket.io Only
* **Trigger Condition:** Current driver clicks "Reject" on offer card. System tracks rejections in-memory.
* **System Action:** If all notified drivers reject, updates order status to `Rejected` & notifies customer.
* **Source Code:** `backend/src/services/orderNotificationService.ts` (line 663)

---

### 6. Seller Pickup Confirmation Alert (`seller-pickup-confirmed`)
* **Transport:** Socket.io Only
* **Target Room:** `order-{orderId}`
* **Trigger Condition:** Driver confirms pickup at seller location (verified via GPS proximity <= 500m).
* **Source Code:** `backend/src/modules/delivery/controllers/deliveryOrderController.ts` (line 761)

---

### 7. All Sellers Picked Up Signal (`all-sellers-picked-up`)
* **Transport:** Socket.io Only
* **Target Room:** `delivery-{deliveryId}`
* **Trigger Condition:** All items from multi-seller order collected. Status automatically transitions to `Out for Delivery`.
* **Source Code:** `backend/src/modules/delivery/controllers/deliveryOrderController.ts` (line 771)

---

### 8. Delivery OTP Sent Confirmation (`otp-sent`)
* **Transport:** Socket.io + SMS
* **Target Room:** `delivery-{deliveryId}`
* **Trigger Condition:** Driver requests delivery OTP code upon arriving at customer location.
* **Source Code:** `backend/src/modules/delivery/controllers/deliveryOrderController.ts` (line 495)

---

### 9. Order Delivered Confirmation (`order-delivered`)
* **Transport:** Socket.io Only
* **Target Room:** `delivery-{deliveryId}`
* **Trigger Condition:** OTP verified successfully and order status updated to `Delivered`.
* **Source Code:** `backend/src/modules/delivery/controllers/deliveryOrderController.ts` (line 585)

---

### 10. Auto-Release Task Reclaim (`releaseStaleAssignments`)
* **Transport:** Background Daemon / System Job
* **Trigger Condition:** Scans undelivered assignments idle > 45 mins. Unassigns driver, resets order status, & re-notifies nearby drivers.
* **Source Code:** `backend/src/services/deliveryAutoReleaseService.ts` (line 66)

---

### 11. Reconnection Catch-Up Rescan (`join-delivery-notifications`)
* **Transport:** Socket.io On-Connect
* **Trigger Condition:** Triggered when driver opens app/reconnects. Rescans unassigned orders/returns created within last 30 mins.
* **Source Code:** `backend/src/services/orderNotificationService.ts` (line 687)

---

### 12. In-App Persistent Feed Notifications
* **Transport:** REST API + MongoDB Database
* **Target Role:** `recipientType: "Delivery"`
* **Types:** `Info`, `Success`, `Warning`, `Error`, `Order`, `Payment`, `System`
* **Endpoints:** `GET /api/delivery/notifications` | `PATCH /api/delivery/notifications/:id/read`
* **Source Code:** `backend/src/modules/delivery/controllers/deliveryNotificationController.ts`

---

## 3. Master Delivery Notification Matrix

| Notification Event | Target Room / Channel | Transport | FCM / Push Payload | Source File Reference |
| :--- | :--- | :--- | :--- | :--- |
| **new-order** | `delivery-{deliveryBoyId}` | Socket.io + FCM | 🎁 New Order Available! | `orderNotificationService.ts:327` |
| **NEW_RETURN_PICKUP** | `delivery-{deliveryBoyId}` | Socket.io + FCM | 🔄 New Return Pickup! | `orderNotificationService.ts:916` |
| **order-accepted** | `delivery-{deliveryBoyId}` | Socket.io | N/A (Card dismissed) | `orderNotificationService.ts:561` |
| **return-accepted** | `delivery-{deliveryBoyId}` | Socket.io | N/A (Card dismissed) | `useDeliveryNotifications.ts:207` |
| **order-rejection-ack** | Direct Socket | Socket.io | N/A (State updated) | `orderNotificationService.ts:663` |
| **seller-pickup-confirmed** | `order-{orderId}` | Socket.io | N/A | `deliveryOrderController.ts:761` |
| **all-sellers-picked-up** | `delivery-{deliveryId}` | Socket.io | N/A (Out for Delivery) | `deliveryOrderController.ts:771` |
| **otp-sent** | `delivery-{deliveryId}` | Socket.io + SMS | N/A | `deliveryOrderController.ts:495` |
| **order-delivered** | `delivery-{deliveryId}` | Socket.io | N/A | `deliveryOrderController.ts:585` |
| **auto-release** | Background Job | DB Daemon | N/A | `deliveryAutoReleaseService.ts:66` |
| **Catch-Up Rescan** | `delivery-{deliveryBoyId}` | Socket.io On-Connect | Re-emits `new-order` | `orderNotificationService.ts:687` |
| **In-App Feed API** | `GET /api/delivery/notif` | REST / MongoDB | N/A | `deliveryNotificationController.ts:10` |
