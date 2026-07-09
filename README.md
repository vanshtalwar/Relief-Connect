# Relief Connect: Disaster Response & Mutual Aid Platform

Relief Connect is a next-generation, high-performance disaster response platform designed to bridge the gap between people in distress (Victims) and those willing to help (Volunteers). 

Built with resilience in mind, this platform features real-time geolocation tracking, offline-first queuing, multi-language support, and a comprehensive coordinator dashboard—all wrapped in a premium, glassmorphic UI.

## 🌟 Key Features & Functionality

### 1. Role-Based Architecture
- **Victims:** Can submit requests for help (Water, Food, Medical, Shelter, Rescue), track incoming volunteers in real-time, and leave trust reviews after a request is resolved.
- **Volunteers:** Can browse a live map of active requests, claim open requests, stream their real-time location as they travel, and chat with victims.
- **Coordinators:** Have access to a powerful analytics dashboard to monitor the macro-level disaster response, verify volunteer identities, and broadcast system-wide alerts.

### 2. Advanced Interactive Mapping
- **High-Accuracy Pin Drops:** When creating a request, the app forces hardware GPS to get an exact location. The map automatically zooms to street level, and users can drag and drop the pin to pinpoint their exact door or building.
- **Dynamic Auto-Framing:** Dashboard maps automatically calculate the geographical boundaries of all visible requests and fluidly zoom/pan to perfectly fit them on the screen.
- **Real-Time Volunteer Tracking:** Once a request is claimed, the app establishes a zero-latency location stream. As the volunteer physically walks toward the victim, their green marker slides across the map, and the proximity distance calculates in real-time.

### 3. Resilience & Offline-First Logistics
- **Low Bandwidth Mode:** For users in areas with damaged infrastructure, this mode disables heavy map tiles, replacing them with lightweight data lists and static GPS coordinates to conserve data and battery.
- **Offline Queuing:** If a user loses internet connection while submitting a request or claiming a task, the platform securely caches the action locally using IndexedDB. Once the connection is restored, a background sync automatically pushes the queued actions to the server.

### 4. Trust, Safety & Verification
- **SOS Emergency Protocol:** A pulsing, high-priority SOS button overrides standard request flows, tagging the request as critical and broadcasting it to all nearby responders immediately.
- **Volunteer Verification Queue:** Coordinators can review pending volunteer registrations (Identity and Background checks) before granting them "Verified" status.
- **Trust Ratings:** After a request is marked "Resolved," both the victim and the volunteer can leave reviews and star ratings to build a community web of trust.

### 5. Coordinator Analytics Dashboard
- **Live Metrics:** View total requests, resolution rates, and active volunteers deployed in the field.
- **Interactive Data Charts:** Visual graphs showing "Requests over Time" and "Requests by Category". 
- **Drill-Down Overlays:** Clicking on any bar or point in the analytics graphs instantly opens a sleek modal overlay, fetching and listing the exact requests that make up that metric.

### 6. Comprehensive Request Lifecycle
- **Submission:** Victim submits a request with photos, category, and urgency.
- **Claim:** Volunteer reviews the Live Request Board and claims the task.
- **Communication:** Integrated Chat Interface unlocks for direct coordination.
- **Resolution:** Volunteer or Victim clicks "Mark as Resolved" once the mission is accomplished, logging it permanently into the status timeline.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Prisma ORM
- **Styling:** Tailwind CSS (with custom Glassmorphism tokens)
- **Mapping:** Leaflet & React-Leaflet
- **Data Visualization:** Recharts
- **State & Validation:** React Hook Form, Zod

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database running locally or remotely

### Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory and add your database URL:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/relief_connect"
   ```

3. **Database Migration & Seed:**
   Push the schema to your database and optionally generate the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Access the Application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧭 How to Use

1. **Sign In:** Use the mockup authentication on the top right to simulate logging in as a `Victim`, `Volunteer`, or `Coordinator`.
2. **Submit a Request:** As a Victim, click the central SOS button or "Create Request" to test the high-accuracy map and offline-queuing capabilities.
3. **Claim a Request:** Switch to a Volunteer account, click an open request on the map, and click "Claim Request." Watch the Live Tracking Map appear.
4. **Resolve & Review:** Click "Mark as Resolved" on a claimed request, which will then prompt the Trust & Safety review form.
5. **Coordinator View:** Switch to a Coordinator account and visit the Dashboard to interact with the analytics charts and verify pending volunteers.

---
*Built to bring communities together when they need it most.*
