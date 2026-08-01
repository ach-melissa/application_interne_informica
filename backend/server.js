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
const attendanceRoutes = require('./routes/attendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/enums', enumRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/groups', groupRoutes);
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
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});