require('dotenv').config();
const supabase = require('../supabaseClient');

// French school year runs Sept -> Aug. e.g. a date in Oct 2024 or Feb 2025 -> "2024-2025"
const getAnneeScolaire = (dateStr) => {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0 = Jan ... 8 = Sep
  const year = d.getFullYear();
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const runAutoArchiveInscriptions = async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 1. find candidates first, don't blind-update
  const { data: candidates, error: fetchErr } = await supabase
    .from('inscriptions')
    .select('id, date_inscription')
    .eq('archived', false)
    .in('statut', ['pending', 'non_confirmed', 'rejected'])
    .lt('date_inscription', oneYearAgo.toISOString().split('T')[0]);

  if (fetchErr) {
    console.error('auto-archive job fetch error:', fetchErr);
    return;
  }

  if (!candidates?.length) {
    console.log('auto-archive job: nothing to archive');
    return;
  }

  // 2. group ids by computed annee_scolaire
  const groups = {};
  for (const row of candidates) {
    const annee = getAnneeScolaire(row.date_inscription);
    (groups[annee] ??= []).push(row.id);
  }

  // 3. one update per group
  let totalArchived = 0;
  for (const [annee_scolaire, ids] of Object.entries(groups)) {
    const { error: updateErr } = await supabase
      .from('inscriptions')
      .update({ archived: true, annee_scolaire })
      .in('id', ids);

    if (updateErr) {
      console.error(`auto-archive job update error (${annee_scolaire}):`, updateErr);
      continue;
    }
    totalArchived += ids.length;
  }

  console.log(`auto-archive job: archived ${totalArchived} inscription(s)`);
};

module.exports = { runAutoArchiveInscriptions };

if (require.main === module) {
  runAutoArchiveInscriptions()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}