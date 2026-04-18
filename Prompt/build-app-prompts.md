🟣 PROMPT 1 — Setup inițial & structura proiectului
Vreau să construim de la zero o aplicație web pentru HR (Resurse Umane) 
pentru lucrarea mea de licență.

TITLU LUCRARE: "Soluție web/mobilă pentru eficientizarea activităților 
din departamentul de Resurse Umane"

STACK ALES:
- Frontend: React.js + Tailwind CSS + React Router
- Backend: Node.js + Express.js
- Baza de date: PostgreSQL
- ORM: Prisma
- Autentificare: JWT

FUNCȚIONALITĂȚI PE CARE TREBUIE SĂ LE AIBĂ APLICAȚIA:
1. Sistem de autentificare (login/logout) cu 3 roluri: Admin HR, Manager, Angajat
2. Gestionare angajați (adăugare, editare, vizualizare, ștergere)
3. Gestionare cereri de concediu (depunere cerere, aprobare/respingere de manager)
4. Pontaj / evidența orelor lucrate
5. Gestionare documente HR (upload, vizualizare)
6. Notificări interne
7. Rapoarte și statistici (grafice)
8. Modul de recrutare (postare joburi, aplicare candidați)

CERINȚĂ: 
- Creează structura completă a proiectului (folderele și fișierele necesare)
- Explică fiecare fișier și folder ce face
- Generează comenzile exacte pe care trebuie să le scriu în terminal
- Codul trebuie să fie curat, comentat în română, și structurat profesional
- Explică fiecare bloc de cod important

🟣 PROMPT 2 — Baza de date (PostgreSQL + Prisma)
Continuăm construirea aplicației HR din licența mea.

STACK: React + Node.js/Express + PostgreSQL + Prisma + JWT

Acum vreau să construim schema completă a bazei de date cu Prisma.

Tabelele necesare:
- Utilizatori (cu roluri: ADMIN_HR, MANAGER, ANGAJAT)
- Angajați (date personale, departament, funcție, salariu, data angajării)
- Departamente
- Cereri concediu (tip, perioadă, status: PENDING/APROBAT/RESPINS)
- Pontaj (dată, ore lucrate, angajat)
- Documente (nume, tip, cale fișier, angajat)
- Notificări (mesaj, citit/necitit, utilizator destinatar)
- Joburi (titlu, descriere, departament, status)
- Candidați (nume, CV, job aplicat, status)

CERINȚĂ:
- Scrie schema Prisma completă (schema.prisma)
- Explică fiecare model și relațiile dintre ele
- Generează comenzile de migrare
- Fă un seed (date de test) cu 5 angajați, 3 departamente, câteva cereri de concediu
- Explică fiecare linie importantă din schema

🟣 PROMPT 3 — Backend (API-ul complet)
Continuăm aplicația HR pentru licența mea.

STACK: Node.js + Express.js + Prisma + PostgreSQL + JWT

Construiește API-ul REST complet cu toate rutele necesare:

MODUL AUTENTIFICARE:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

MODUL ANGAJAȚI:
- GET /api/angajati (toți angajații - doar ADMIN_HR)
- POST /api/angajati (adaugă angajat)
- PUT /api/angajati/:id (editează)
- DELETE /api/angajati/:id (șterge)
- GET /api/angajati/:id (detalii angajat)

MODUL CONCEDII:
- POST /api/concedii (depune cerere - orice angajat)
- GET /api/concedii (liste - filtrate după rol)
- PUT /api/concedii/:id/aprobare (aprobă - manager/HR)
- PUT /api/concedii/:id/respingere (respinge)

MODUL PONTAJ:
- POST /api/pontaj/check-in
- POST /api/pontaj/check-out
- GET /api/pontaj/:angajatId

MODUL STATISTICI:
- GET /api/statistici/prezenta
- GET /api/statistici/concedii
- GET /api/statistici/departamente

CERINȚĂ:
- Cod Node.js/Express complet pentru fiecare rută
- Middleware de autentificare JWT și autorizare pe roluri
- Validare date de intrare
- Gestionare erori profesională
- Comentarii explicative în română pe fiecare funcție importantă
- Structura folderelor: routes/, controllers/, middleware/, utils/

🟣 PROMPT 4 — Frontend React (Dashboard + Pagini)
Continuăm aplicația HR pentru licența mea.

STACK FRONTEND: React.js + Tailwind CSS + React Router + Axios

Construiește frontend-ul complet al aplicației HR.

PAGINI NECESARE:
1. /login - Pagina de autentificare (formular email + parolă)
2. /dashboard - Dashboard principal cu statistici și grafice
3. /angajati - Lista angajaților cu search și filtrare
4. /angajati/nou - Formular adăugare angajat nou
5. /angajati/:id - Profil detaliat angajat
6. /concedii - Lista cereri concediu
7. /concedii/cerere-noua - Formular cerere concediu
8. /pontaj - Interfața check-in/check-out + istoric
9. /recrutare - Lista joburi + candidați
10. /rapoarte - Grafice și statistici

CERINȚĂ:
- Cod React complet pentru fiecare pagină
- Design profesional cu Tailwind CSS (culori: albastru #1E40AF + alb + gri)
- Meniu lateral (sidebar) cu navigare
- Grafice cu biblioteca Recharts (inclus în React)
- Protecție rute (dacă nu ești logat → redirect la login)
- Componente reutilizabile: Button, Input, Modal, Table, Card
- Axios pentru apeluri către backend
- Comentarii explicative în română
- Design responsiv (funcționează și pe mobil)

🟣 PROMPT 5 — Autentificare completă (Login + Roluri)
Construiește sistemul complet de autentificare pentru aplicația HR.

CERINȚĂ DETALIATĂ:
- Login cu email + parolă (JWT token, expiră în 24h)
- 3 roluri cu permisiuni diferite:
  * ADMIN_HR: vede și face tot
  * MANAGER: vede echipa sa, aprobă concedii
  * ANGAJAT: vede doar datele proprii, depune cereri
- Parolele stocate criptat cu bcrypt
- Refresh token pentru sesiuni lungi
- Pagina de login cu design profesional
- Mesaje de eroare clare (parolă greșită, cont inexistent)
- "Ține-mă minte" (remember me)
- Logout care șterge token-ul

Explică pas cu pas cum funcționează JWT și de ce este sigur.
Cod complet backend + frontend, comentat în română.

🟣 PROMPT 6 — Modul Concedii (cel mai complex)
Construiește modulul complet de gestionare a concediilor pentru aplicația HR.

FLUX COMPLET:
1. Angajatul completează formularul: tip concediu, dată început, dată sfârșit, motiv
2. Sistemul calculează automat numărul de zile lucrătoare
3. Sistemul verifică dacă angajatul mai are zile disponibile
4. Se trimite notificare la manager
5. Managerul vede cererea și o aprobă/respinge cu motivare
6. Angajatul primește notificare cu decizia
7. HR-ul vede toate cererile cu posibilitate de export

TIPURI CONCEDIU: Odihnă, Medical, Fără plată, Maternitate/Paternitate, Studii

CERINȚĂ:
- Backend: toate rutele și logica de business
- Frontend: formulare, pagini, butoane de aprobare
- Calendar vizual care arată cine e în concediu
- Calculul automat al zilelor rămase
- Export lista în PDF/Excel
- Cod complet, comentat în română

🟣 PROMPT 7 — Dashboard cu statistici și grafice
Construiește dashboard-ul principal al aplicației HR cu statistici vizuale.

CARDURI STATISTICI (sus):
- Total angajați activi
- Cereri concediu în așteptare
- Angajați prezenți azi (pontaj)
- Joburi deschise pentru recrutare

GRAFICE (cu Recharts):
1. Grafic linie: Prezența angajaților în ultimele 30 de zile
2. Grafic bară: Concedii pe departamente în luna curentă
3. Grafic pie/donut: Distribuția angajaților pe departamente
4. Grafic bară: Ore lucrate per angajat săptămâna curentă

ALTE ELEMENTE:
- Lista ultimelor 5 cereri de concediu (cu status colorat)
- Lista ultimilor 3 angajați adăugați
- Notificări recente

CERINȚĂ:
- Cod React complet cu Recharts
- Design modern, curat, profesional
- Date reale din API (cu loading states)
- Responsiv pentru mobil
- Comentat în română

🟣 PROMPT 8 — Finalizare și rulare aplicație
Aplicația HR pentru licența mea este aproape gata. Acum am nevoie de:

1. FIȘIER README.md complet cu:
   - Descrierea proiectului
   - Tehnologii folosite
   - Instrucțiuni de instalare pas cu pas
   - Cum se pornește aplicația
   - Conturile de test (email + parolă pentru fiecare rol)

2. VARIABILE DE MEDIU (.env):
   - Toate variabilele necesare pentru backend și frontend
   - Explicație pentru fiecare

3. COMENZI FINALE de pornire:
   - Cum pornesc baza de date
   - Cum pornesc backend-ul
   - Cum pornesc frontend-ul
   - Cum accesez aplicația în browser

4. REZOLVARE ERORI COMUNE:
   - Ce fac dacă portul e ocupat
   - Ce fac dacă baza de date nu se conectează
   - Ce fac dacă npm install dă erori

Explică totul simplu, pas cu pas, ca pentru cineva care nu a mai făcut asta.