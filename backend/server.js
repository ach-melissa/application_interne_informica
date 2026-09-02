
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const formationRoutes = require('./routes/formationRoutes');
const etudiantRoutes = require('./routes/etudiantRoutes');
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const groupRoutes = require('./routes/groupRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const profRoutes = require('./routes/profRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const enumRoutes = require('./routes/enumRoutes');
const comptableRoutes = require('./routes/comptableRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const paymentAlertsRoutes = require('./routes/paymentAlertsRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const cron = require('node-cron');
const { runPaymentAlerts } = require('./jobs/paymentAlerts');
const { runAutoArchiveInscriptions } = require('./jobs/autoArchiveInscriptions');
const parametreRoutes = require('./routes/parametreRoutes');
const { runArchiveReminder } = require('./jobs/archiveReminder');
const { runPointageReminder } = require('./jobs/pointageReminder');
const historiqueRoutes = require('./routes/historiqueRoutes');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/enums', enumRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payment-alerts', paymentAlertsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/profs', profRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/comptable', comptableRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/archive', require('./routes/archiveRoutes'));
app.use('/api/statistiques', require('./routes/statistiqueRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/parametres', parametreRoutes);
app.use('/api/historique', historiqueRoutes);
// Payment overdue alerts — runs immediately on startup, then every 2 hours.
console.log('Running payment alerts job on startup...');
runPaymentAlerts();

cron.schedule('0 */2 * * *', () => {
  console.log('Running payment alerts job...');
  runPaymentAlerts();
}, {
  timezone: 'Africa/Algiers'
});
// Auto-archive stale inscriptions — runs daily at 03:00 server time.
cron.schedule('0 3 * * *', () => {
  console.log('Running auto-archive inscriptions job...');
  runAutoArchiveInscriptions();
}, {
  timezone: 'Africa/Algiers'
});
// Reminder to archive finished groups — runs on startup, then daily in December.
console.log('Running archive reminder job on startup...');
runArchiveReminder();

cron.schedule('30 8 * 12 *', () => {
  console.log('Running archive reminder job...');
  runArchiveReminder();
}, {
  timezone: 'Africa/Algiers'
});
// Rappel de pointage pour les profs — tourne au démarrage, puis chaque jour à 7h.
console.log('Running pointage reminder job on startup...');
runPointageReminder();

cron.schedule('0 7 * * *', () => {
  console.log('Running pointage reminder job...');
  runPointageReminder();
}, {
  timezone: 'Africa/Algiers'
});
app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT}`);
});