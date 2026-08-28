const DAY_MAP = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

export function computeNextSessionDate(joursFormation, lastSessionDate) {
  const days = (joursFormation || '')
    .split(',')
    .map(d => DAY_MAP[d.trim().toLowerCase()])
    .filter(d => d !== undefined);
  if (days.length === 0) return new Date().toISOString().slice(0, 10);

  const start = lastSessionDate ? new Date(lastSessionDate) : new Date();
  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + i);
    if (days.includes(candidate.getDay())) return candidate.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function resolveGroupDuration(group, formation, niveau) {
  if (group.use_default_duree === false) {
    return { type_duree: group.type_duree, total: group.duree_valeur };
  }
  if (niveau && formation?.type_duree_uniforme === false) {
    return { type_duree: niveau.type_duree, total: niveau.duree_valeur };
  }
  return { type_duree: formation?.type_duree, total: formation?.heures };
}