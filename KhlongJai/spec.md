# KhlongJai (คล้องใจ) - Caregiver PWA Development Plan

## 1. Project Overview
"KhlongJai" (Connect Hearts) is a streamlined caregiver monitoring system designed as a Progressive Web App (PWA). It provides a real-time safety dashboard for family members to monitor elderly individuals wearing a "KhlongJai Wearable" (simulated by a separate PWA mockup).

### Primary Goals:
- **Instant Response:** Receive immediate alerts for falls and SOS triggers.
- **Vital Monitoring:** Track heart rate and oxygen levels in real-time.
- **Live Location:** Pinpoint the elder's location on a dashboard map.
- **Accessibility:** Ensure the app is easily installable on any smartphone (iOS/Android) via PWA technology.

---

## 2. Technical Stack
- **Frontend Framework:** React (TypeScript) with Vite (for speed and PWA plugin support).
- **Styling:** Vanilla CSS (for clean, lightweight, and custom modern aesthetics).
- **Real-time Backend:** Firebase (Firestore) for data synchronization.
- **Authentication:** Firebase Auth (Google Sign-In).
- **Alerts:** Firebase Cloud Messaging (FCM) for Web Push notifications.
- **Maps:** Leaflet.js with OpenStreetMap (lightweight alternative to Google Maps).

---

## 3. System Architecture
### A. KhlongJai Caregiver App (Consumer)
- **Home Dashboard:**
    - **Emergency Banner:** Flashes red for SOS or Fall alerts.
    - **Vitals Grid:** HR and SpO2 cards with color-coded "Safe/Warning/Danger" zones.
    - **Live Map:** Real-time marker of the elder's current position.
- **Alert History:** Log of past SOS/Fall events with timestamps.
- **Settings:** Profile management and "Buddy Pairing" via ID.

### B. KhlongJai Wearable Mockup (Producer)
- **Status Simulator:**
    - **Heart Rate Slider/Generator:** Manually set or auto-generate HR (60–120 bpm).
    - **Oxygen (SpO2) Slider:** Simulate saturation levels (90–100%).
- **Emergency Triggers:**
    - **SOS Button:** Large red button to trigger an active alert.
    - **Fall Simulator:** Button to simulate a sudden impact (or accelerometer-based trigger).
- **Location Streamer:** Periodically writes the device's `navigator.geolocation` to Firestore.

---

## 4. Feature Specifications

### 2.1 Passive Fall Detection (PWA Notification)
- **Detection:** The Wearable PWA uses a "Fall Button" (Mock) or high-G force trigger via the `devicemotion` API.
- **Notification:** Caregiver PWA receives a high-priority browser notification even when the app is in the background.

### 2.2 Heart Rate & Oxygen Dashboard
- **Update Frequency:** Every 5-10 seconds.
- **Alert Logic:** Dashboard highlights vitals in red if HR > 110 bpm or SpO2 < 94%.

### 2.3 SOS Receiver
- **Behavior:** On SOS trigger, the Caregiver PWA plays a continuous alarm sound until the "Acknowledge" button is pressed.

### 2.4 Location Dashboard
- **Mapping:** Integrated Leaflet map showing the last known `lat/lng` with a timestamp.

---

## 5. Development Roadmap

### Phase 1: Foundation & Firebase
- [ ] Initialize React + Vite project.
- [ ] Configure Firebase (Firestore & Auth).
- [ ] Implement PWA Manifest and Service Worker.

### Phase 2: The Wearable Mockup ("KhlongJai-Wear")
- [ ] Create UI for simulating Vitals (HR/SpO2).
- [ ] Implement "Trigger SOS" and "Trigger Fall" logic (Writing to Firestore).
- [ ] Set up Geolocation streaming.

### Phase 3: The Caregiver Dashboard ("KhlongJai-Dash")
- [ ] Build Real-time Vitals cards using Firestore listeners.
- [ ] Implement the Map view (Leaflet integration).
- [ ] Develop the Global Alert system (Visual/Audio).

### Phase 4: Notifications & PWA Polish
- [ ] Set up Firebase Cloud Messaging for background push notifications.
- [ ] Add "Install to Home Screen" prompts.
- [ ] Offline caching for dashboard data.

### Phase 5: Final Validation
- [ ] End-to-end testing between Wearable Mockup and Dashboard.
- [ ] Mobile browser compatibility check.
