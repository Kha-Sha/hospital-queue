# Qalm - Hospital OPD Queue Management SaaS

## What Qalm Is
Qalm eliminates hospital waiting room chaos. Patients scan a QR code, get a token, and track their queue position in real time on their phone. Receptionists manage patient flow from a dashboard. Doctors call patients when ready. No app download needed.

## Positioning
"Stop bad Google reviews. Cut no-shows by 40%."
Not a queue management system — a patient experience tool that protects clinic reputation and recovers lost revenue.

## Pricing
- Basic: ₹999/month — queue management, multi-department, analytics
- Pro: ₹1,999/month — everything + WhatsApp reminders, no-show recovery, patient recall, Google review prompts

## Live URLs
- App: hospital-queue-kappa.vercel.app
- GitHub: github.com/Kha-Sha/hospital-queue
- Firebase Project: hospital-queue-80a31

## Tech Stack
- Frontend: React, Framer Motion, React Router, lucide-react
- Backend: Firebase (Firestore, Auth)
- Fonts: DM Sans (body), DM Serif Display (token number)
- Deployment: Vercel
- Design: Dark theme, CSS variables, no emoji icons, no copy-paste particles

## Architecture
- Multi-tenant: each hospital's data in hospitals/{adminUid}/...
- Collections: hospitals/{id}/queue, /pending, /settings/hospital, /departments, /doctors, /admins
- Global: patients (cross-hospital), leads (demo requests)
- Auth emails: patients use phone@hospital.com, admins use phone@hospital-admin.com, doctors use phone@hospital-doctor.com

## User Roles
1. PATIENT — scans QR → registers → pending screen → gets token → tracks queue → Get Well Soon
2. ADMIN/RECEPTIONIST — assigns departments to pending patients, manages queue, sends WhatsApp reminders, views analytics
3. DOCTOR — logs in, sees department queue, calls next patient

## Complete Feature List

### Patient Features
- QR code registration (hospital-specific URL with ?hospital= param)
- Real-time token tracking
- Department and doctor name shown on token screen
- Estimated appointment time
- Sound notification + vibration when called
- "I'm on my way" confirmation
- Get Well Soon screen (warm light background, patient name, doctor name)
- Google review prompt on Get Well Soon screen
- WhatsApp deep link for queue updates
- Token receipt on assignment
- Visit history (last 5 completed visits)
- Cancel token (leave queue) — also deletes pending doc for clean re-registration
- Queue paused banner
- Multi-language: English, Hindi, Kannada, Tamil

### Admin/Receptionist Features
- Hospital onboarding wizard (name + active departments)
- Pending patients list with department assignment
- Waiting queue with department tabs
- Priority queue jump (purple button)
- Call next token (per department)
- Done / No Show buttons
- 3+ min badge on called patient (visual cue to manually mark no-show)
- WhatsApp reminder button (for patients 4+ positions back)
- No-show recovery WhatsApp button
- Patient recall system (patients not seen in 30+ days)
- Manual queue reset button
- Analytics dashboard (today-only stats with date label, completion rate, no-show rate, busiest department)
- Export patient data as CSV
- Add doctor accounts (secondary Firebase app, no session interruption)
- Deactivate doctor accounts (blocks login immediately)
- Add staff/admin accounts
- Patient search by name or phone
- QR code display + print button (QR card sets document.title for clean printing)
- Hospital settings: name, WhatsApp number, Google Place ID
- Pause/resume queue
- Offline banner when connection drops (changes sync when reconnected)

### Doctor Features
- Department-specific queue view
- Next patient card with name and token
- Call next patient (atomic Firestore transaction)
- Stats: now calling, waiting, completed
- Deactivated account screen if admin deactivates

### Home/Landing Page
- Hero: "Your queue. On your phone."
- Feature cards (3)
- Pricing section (Basic ₹999, Pro ₹1,999)
- Lead capture form (10-digit phone validation, saves to Firestore leads collection)
- Live demo modal (10-minute timer, fake patients, local state only)
- Language selector (EN/HI/KN/TA)

## Key Technical Decisions
- ParticleCanvas: single shared component with 500ms lazy start so UI renders first
- CSS variables in :root for all colors and spacing
- Firestore transactions for token assignment (race condition safe)
- localStorage for hasBeenSeen, language preference, hospitalId, WhatsApp clicked
- onAuthStateChanged used on all login and dashboard pages — eliminates hard-reload flash
- window.innerWidth for responsive grid (known gap — doesn't update on resize)
- Firestore offline persistence via initializeFirestore + persistentLocalCache (multi-tab safe)
- React.lazy + Suspense for all pages except Home — code splits into per-page chunks
- Analytics filter by today's date client-side from Firestore timestamps

## Known Remaining Gaps
- WhatsApp Business API not integrated — using wa.me deep links (manual, not automatic)
- Admin self-registration not built — first admin account created manually in Firebase console (acceptable for first 50 clinics)
- iOS web audio restricted in background — sound notification may not fire when screen is locked
- Estimated appointment time uses simple 10 min/patient average — long consultations throw off estimates
- window.innerWidth responsive grid doesn't update on device rotation (AdminDashboard)
- No rate limiting on QR registration endpoint — abuse vector if URL is shared publicly

## Pre-Sales Checklist (All Complete)
- ✅ onAuthStateChanged on all dashboard pages
- ✅ Firestore security rules — role-based, hospital-isolated
- ✅ Multi-tenant architecture — hospitals/{adminUid}/...
- ✅ Analytics shows today-only data with correct label
- ✅ Auto no-show removed — replaced with 3+ min badge
- ✅ Offline persistence enabled
- ✅ Offline banner in admin dashboard
- ✅ Loading speed — React.lazy, ParticleCanvas delay
- ✅ Login flash eliminated — onAuthStateChanged in login pages
- ✅ Data export as CSV
- ✅ Doctor account deactivation
- ✅ Cancel token with downstream cleanup
- ✅ QR card printable page
- ✅ Lead capture form on landing page
- ✅ Demo modal (10 min, zero Firebase writes)
- ✅ Pricing page (Basic ₹999, Pro ₹1999)
- ✅ WhatsApp reminders (manual deep links)
- ✅ No-show recovery WhatsApp
- ✅ Patient recall (30+ days)
- ✅ Google review prompt on Get Well Soon screen
- ✅ Multi-language EN/HI/KN/TA
- ✅ Mobile optimized
- ✅ Firestore offline persistence

## Sales Playbook
- Target: solo to 5-doctor private clinics, NOT government hospitals, NOT large chains
- Hot prospect signal: clinic that recently got a bad Google review about waiting times
- Opening line: "Has your clinic had patients complain about waiting times recently?"
- Demo: show the demo modal on phone, let them click
- Offer: 30 days free, ₹2000 setup fee via UPI on the spot, ₹999/month after
- Leave behind: printed A5 card with QR code and one line of copy

## V2 Roadmap
- WhatsApp Business API integration (replace deep links with actual sent messages)
- Digital health records vault
- Native mobile app (React Native)
- Full multi-hospital management dashboard
- Advanced analytics with charts
- Rate limiting on patient registration
- Estimated wait time using real consultation duration data
