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
- Cancel token (leave queue)
- Queue paused banner
- Multi-language: English, Hindi, Kannada, Tamil

### Admin/Receptionist Features
- Hospital onboarding wizard (name + active departments)
- Pending patients list with department assignment
- Waiting queue with department tabs
- Priority queue jump (purple button)
- Call next token (per department)
- Done / No Show buttons
- WhatsApp reminder button (for patients 4+ positions back)
- No-show recovery WhatsApp button
- Patient recall system (patients not seen in 30+ days)
- Manual queue reset button
- Analytics dashboard (today's stats, completion rate, no-show rate, busiest department)
- Add doctor accounts (secondary Firebase app, no session interruption)
- Add staff/admin accounts
- Patient search by name or phone
- QR code display + print button
- Hospital settings: name, WhatsApp number, Google Place ID
- Pause/resume queue

### Doctor Features
- Department-specific queue view
- Next patient card with name and token
- Call next patient (atomic Firestore transaction)
- Stats: now calling, waiting, completed

### Home/Landing Page
- Hero: "Your queue. On your phone."
- Feature cards (3)
- Pricing section (Basic ₹999, Pro ₹1,999)
- Lead capture form (saves to Firestore leads collection)
- Live demo modal (10-minute timer, fake patients, local state only)
- Language selector (EN/HI/KN/TA)

## Key Technical Decisions
- ParticleCanvas: single shared component, not copy-pasted
- CSS variables in :root for all colors and spacing
- Firestore transactions for token assignment (race condition safe)
- localStorage for hasBeenSeen, language preference, hospitalId, WhatsApp clicked
- onAuthStateChanged pattern recommended but not yet implemented (known gap)
- window.innerWidth for responsive grid (known gap — doesn't update on resize)

## Known Remaining Gaps
- onAuthStateChanged not used — auth redirect fires before Firebase restores session on hard reload
- window.innerWidth responsive grid doesn't update on device rotation
- WhatsApp Business API not integrated — using wa.me deep links (sufficient for pilot)
- No admin self-registration — first admin account created manually in Firebase console
- Analytics counts all-time data, not today-only (labeled "Today's Analytics" — misleading)
- Auto no-show detection (3 min) claimed in features but client-side only — stops if browser closes
- Particle canvas duplicated in AdminLogin and DoctorLogin (not yet extracted to ParticleCanvas component)

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
- onAuthStateChanged implementation
- Today-only analytics filter
