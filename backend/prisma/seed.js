// =====================================================================
// SEED — Populează baza de date cu date de test realiste
// Rulează cu: npm run prisma:seed (sau npx prisma db seed)
// =====================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Încep seed-ul bazei de date...\n');

  // ------------------------------------------------------------------
  // 1. Șterge datele vechi (ordinea contează: foreign keys)
  // ------------------------------------------------------------------
  console.log('🗑️  Șterg datele existente...');
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // ------------------------------------------------------------------
  // 2. Creează departamente
  // ------------------------------------------------------------------
  console.log('🏢 Creez departamentele...');
  const deptIT = await prisma.department.create({
    data: { name: 'IT', description: 'Departament tehnologie și dezvoltare software' },
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Resurse Umane', description: 'Departament HR și recrutare' },
  });
  const deptFin = await prisma.department.create({
    data: { name: 'Financiar', description: 'Departament contabilitate și finanțe' },
  });

  // ------------------------------------------------------------------
  // 3. Parolă comună criptată pentru toți utilizatorii de test
  // ------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('Parola123!', 10);

  // ------------------------------------------------------------------
  // 4. Utilizator + angajat: Admin HR
  // ------------------------------------------------------------------
  console.log('👥 Creez utilizatorii și angajații...');

  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin.hr@firma.ro',
      passwordHash,
      role: 'ADMIN_HR',
      employee: {
        create: {
          firstName: 'Maria',
          lastName: 'Popescu',
          cnp: '2850101123456',
          phone: '0722111111',
          birthDate: new Date('1985-01-01'),
          position: 'HR Manager',
          salary: 9500.0,
          hireDate: new Date('2020-03-15'),
          vacationDaysLeft: 15,
          departmentId: deptHR.id,
        },
      },
    },
    include: { employee: true },
  });

  // ------------------------------------------------------------------
  // 5. Manager IT (va fi manager pentru alți 2 angajați)
  // ------------------------------------------------------------------
  const userManagerIT = await prisma.user.create({
    data: {
      email: 'manager.it@firma.ro',
      passwordHash,
      role: 'MANAGER',
      employee: {
        create: {
          firstName: 'Andrei',
          lastName: 'Ionescu',
          cnp: '1820505234567',
          phone: '0722222222',
          birthDate: new Date('1982-05-05'),
          position: 'IT Team Lead',
          salary: 15000.0,
          hireDate: new Date('2019-06-01'),
          vacationDaysLeft: 18,
          departmentId: deptIT.id,
        },
      },
    },
    include: { employee: true },
  });

  // ------------------------------------------------------------------
  // 6. Angajat 1: Full Stack Developer (raportează la Andrei)
  // ------------------------------------------------------------------
  const userDev1 = await prisma.user.create({
    data: {
      email: 'dev1@firma.ro',
      passwordHash,
      role: 'ANGAJAT',
      employee: {
        create: {
          firstName: 'Alexandru',
          lastName: 'Georgescu',
          cnp: '1950720345678',
          phone: '0722333333',
          birthDate: new Date('1995-07-20'),
          position: 'Full Stack Developer',
          salary: 11000.0,
          hireDate: new Date('2022-09-01'),
          vacationDaysLeft: 21,
          departmentId: deptIT.id,
          managerId: userManagerIT.employee.id,
        },
      },
    },
    include: { employee: true },
  });

  // ------------------------------------------------------------------
  // 7. Angajat 2: Frontend Developer (raportează la Andrei)
  // ------------------------------------------------------------------
  const userDev2 = await prisma.user.create({
    data: {
      email: 'dev2@firma.ro',
      passwordHash,
      role: 'ANGAJAT',
      employee: {
        create: {
          firstName: 'Elena',
          lastName: 'Marin',
          cnp: '2980215456789',
          phone: '0722444444',
          birthDate: new Date('1998-02-15'),
          position: 'Frontend Developer',
          salary: 9500.0,
          hireDate: new Date('2023-03-15'),
          vacationDaysLeft: 19,
          departmentId: deptIT.id,
          managerId: userManagerIT.employee.id,
        },
      },
    },
    include: { employee: true },
  });

  // ------------------------------------------------------------------
  // 8. Angajat 3: Contabil în Financiar
  // ------------------------------------------------------------------
  const userContabil = await prisma.user.create({
    data: {
      email: 'contabil@firma.ro',
      passwordHash,
      role: 'ANGAJAT',
      employee: {
        create: {
          firstName: 'Cristina',
          lastName: 'Stan',
          cnp: '2880310567890',
          phone: '0722555555',
          birthDate: new Date('1988-03-10'),
          position: 'Contabil Senior',
          salary: 8500.0,
          hireDate: new Date('2021-11-01'),
          vacationDaysLeft: 21,
          departmentId: deptFin.id,
        },
      },
    },
    include: { employee: true },
  });

  // ------------------------------------------------------------------
  // 9. Cereri de concediu (statusuri variate pentru testare)
  // ------------------------------------------------------------------
  console.log('🏖️  Creez cereri de concediu...');

  // Cerere APROBATĂ — Alexandru
  await prisma.leaveRequest.create({
    data: {
      employeeId: userDev1.employee.id,
      leaveType: 'ODIHNA',
      startDate: new Date('2026-05-10'),
      endDate: new Date('2026-05-17'),
      daysCount: 6,
      reason: 'Vacanță de primăvară',
      status: 'APROBATA',
      reviewedBy: userManagerIT.employee.id,
      reviewedAt: new Date('2026-04-15'),
    },
  });

  // Cerere IN_ASTEPTARE — Elena
  await prisma.leaveRequest.create({
    data: {
      employeeId: userDev2.employee.id,
      leaveType: 'ODIHNA',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-07'),
      daysCount: 5,
      reason: 'Concediu de vară',
      status: 'IN_ASTEPTARE',
    },
  });

  // Cerere RESPINSĂ — Cristina
  await prisma.leaveRequest.create({
    data: {
      employeeId: userContabil.employee.id,
      leaveType: 'FARA_PLATA',
      startDate: new Date('2026-04-28'),
      endDate: new Date('2026-05-05'),
      daysCount: 6,
      reason: 'Rezolvare probleme personale',
      status: 'RESPINSA',
      reviewNote: 'Perioada coincide cu închiderea lunii — activitate critică',
      reviewedBy: userAdmin.employee.id,
      reviewedAt: new Date('2026-04-17'),
    },
  });

  // Cerere MEDICAL APROBATĂ — Alexandru
  await prisma.leaveRequest.create({
    data: {
      employeeId: userDev1.employee.id,
      leaveType: 'MEDICAL',
      startDate: new Date('2026-03-05'),
      endDate: new Date('2026-03-08'),
      daysCount: 3,
      reason: 'Adeverință medicală nr. 12345',
      status: 'APROBATA',
      reviewedBy: userManagerIT.employee.id,
      reviewedAt: new Date('2026-03-05'),
    },
  });

  // ------------------------------------------------------------------
  // 10. Pontaje — ultimele 3 zile lucrătoare per angajat activ
  // ------------------------------------------------------------------
  console.log('⏰ Creez pontaje...');
  const employees = [
    userDev1.employee,
    userDev2.employee,
    userContabil.employee,
    userManagerIT.employee,
  ];
  const today = new Date();

  for (const emp of employees) {
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const checkIn = new Date(date);
      checkIn.setHours(9, Math.floor(Math.random() * 15), 0);

      const checkOut = new Date(date);
      checkOut.setHours(17, 30 + Math.floor(Math.random() * 30), 0);

      const hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn,
          checkOut,
          hoursWorked: parseFloat(hoursWorked),
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // 11. Joburi deschise + candidați
  // ------------------------------------------------------------------
  console.log('💼 Creez joburi și candidați...');

  const jobDevOps = await prisma.job.create({
    data: {
      title: 'Senior DevOps Engineer',
      description: 'Căutăm un DevOps cu experiență în AWS, Docker, Kubernetes.',
      requirements: 'Min. 3 ani experiență AWS, cunoștințe CI/CD, Linux, scripting.',
      departmentId: deptIT.id,
      salaryMin: 12000,
      salaryMax: 18000,
      location: 'București / Remote',
      status: 'DESCHIS',
    },
  });

  await prisma.job.create({
    data: {
      title: 'HR Recruiter Junior',
      description: 'Rol junior în echipa de HR, focus pe recrutare IT.',
      requirements: 'Absolvent studii superioare, engleză fluent, abilități comunicare.',
      departmentId: deptHR.id,
      salaryMin: 5500,
      salaryMax: 7500,
      location: 'București',
      status: 'DESCHIS',
    },
  });

  // Candidați pentru jobul DevOps
  await prisma.candidate.createMany({
    data: [
      {
        jobId: jobDevOps.id,
        firstName: 'Radu',
        lastName: 'Dumitrescu',
        email: 'radu.dumitrescu@email.com',
        phone: '0733111222',
        cvPath: '/uploads/cv/radu_dumitrescu.pdf',
        status: 'IN_REVIZUIRE',
      },
      {
        jobId: jobDevOps.id,
        firstName: 'Ana',
        lastName: 'Tudor',
        email: 'ana.tudor@email.com',
        phone: '0733333444',
        cvPath: '/uploads/cv/ana_tudor.pdf',
        status: 'INTERVIU',
      },
      {
        jobId: jobDevOps.id,
        firstName: 'Mihai',
        lastName: 'Pop',
        email: 'mihai.pop@email.com',
        cvPath: '/uploads/cv/mihai_pop.pdf',
        status: 'APLICAT',
      },
    ],
  });

  // ------------------------------------------------------------------
  // 12. Notificări inițiale
  // ------------------------------------------------------------------
  console.log('🔔 Creez notificări...');
  await prisma.notification.createMany({
    data: [
      {
        userId: userDev1.id,
        title: 'Cerere aprobată',
        message: 'Cererea ta de concediu (10-17 mai) a fost aprobată.',
        link: '/leaves',
        isRead: false,
      },
      {
        userId: userManagerIT.id,
        title: 'Cerere nouă',
        message: 'Elena Marin a depus o cerere nouă de concediu.',
        link: '/leaves',
        isRead: false,
      },
      {
        userId: userContabil.id,
        title: 'Cerere respinsă',
        message: 'Cererea ta de concediu fără plată a fost respinsă.',
        link: '/leaves',
        isRead: true,
      },
    ],
  });

  // ------------------------------------------------------------------
  // Final — rezumat
  // ------------------------------------------------------------------
  console.log('\n✅ Seed finalizat cu succes!\n');
  console.log('📊 Rezumat:');
  console.log(`   • ${await prisma.department.count()} departamente`);
  console.log(`   • ${await prisma.user.count()} utilizatori`);
  console.log(`   • ${await prisma.employee.count()} angajați`);
  console.log(`   • ${await prisma.leaveRequest.count()} cereri concediu`);
  console.log(`   • ${await prisma.attendance.count()} pontaje`);
  console.log(`   • ${await prisma.job.count()} joburi`);
  console.log(`   • ${await prisma.candidate.count()} candidați`);
  console.log(`   • ${await prisma.notification.count()} notificări\n`);
  console.log('🔑 Conturi de test (parola pentru toate: Parola123!):');
  console.log('   • admin.hr@firma.ro     → ADMIN_HR');
  console.log('   • manager.it@firma.ro   → MANAGER');
  console.log('   • dev1@firma.ro         → ANGAJAT');
  console.log('   • dev2@firma.ro         → ANGAJAT');
  console.log('   • contabil@firma.ro     → ANGAJAT\n');
}

main()
  .catch((e) => {
    console.error('❌ Eroare la seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });