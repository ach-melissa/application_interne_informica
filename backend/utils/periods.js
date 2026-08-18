const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
};

// Which price applies: student promo > group promo > formation price
const computeStudentTotal = (baseTotal, inscription, group) => {
  if (inscription.en_promotion && inscription.prix_promotion != null) return Number(inscription.prix_promotion);
  if (group.en_promotion && group.prix_promotion != null) return Number(group.prix_promotion);
  return baseTotal;
};

// Resolves the effective schedule for a group: formation template if
// use_default_periods, else the group's own custom periods. Each period's
// due_date is jours_offset days AFTER THE PREVIOUS PERIOD (chained), not
// always from date_debut — mirrors setGroupPeriods in groups.controller.js.
const resolveGroupPeriods = (group, formationPeriods, groupPeriods) => {
  const template = group.use_default_periods ? formationPeriods : groupPeriods;
  if (!group.date_debut) return (template ?? []).map(p => ({ ...p, due_date: null }));

  let current = new Date(group.date_debut);
  return (template ?? []).map(p => {
    current = new Date(current);
    current.setDate(current.getDate() + Number(p.jours_offset));
    return { ...p, due_date: current.toISOString().slice(0, 10) };
  });
};

module.exports = { addDays, computeStudentTotal, resolveGroupPeriods };