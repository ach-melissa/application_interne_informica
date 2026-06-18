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

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/profs', profRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});