const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const formationRoutes = require('./routes/formationRoutes'); 
const etudiantRoutes = require('./routes/etudiantRoutes');
const inscriptionRoutes = require('./routes/inscriptionRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/formations', formationRoutes); 
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/inscriptions', inscriptionRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});