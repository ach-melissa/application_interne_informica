import { getCivilite } from "./templates/AttestationDefault";

/**
 * Formate une date (string ISO ou Date) en français long, ex: "15 Mars 1999".
 */
const formatDateLong = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

/**
 * Génère un numéro de référence séquentiel pour l'année en cours,
 * ex: "001/2026". Utilise l'index de la boucle d'impression comme
 * incrément simple ; à terme, remplacez ceci par un vrai compteur
 * persistant côté backend (table `attestations.numero_ref`) pour
 * éviter les doublons entre sessions d'impression différentes.
 */
const generateNumeroRef = (index = 0) => {
  const year = new Date().getFullYear();
  const sequence = String(index + 1).padStart(3, "0");
  return `${sequence}/${year}`;
};

/**
 * mapEtudiantToAttestationFields
 *
 * Transforme une inscription (avec ses relations étudiant + formation
 * jointes par le backend, cf. inscriptionController.getInscriptions)
 * en props directement consommables par <AttestationDefault />.
 *
 * @param {Object} inscription - { etudiant, formation, ... }
 * @param {Object} options - { periode, dateSignature, index }
 */
export const mapEtudiantToAttestationFields = (
  inscription,
  { periode = "", dateSignature = "", index = 0 } = {}
) => {
  const etudiant = inscription?.etudiant || {};
  const formation = inscription?.formation || {};

  const { main: civiliteMain, sup: civiliteSup } = getCivilite(
    etudiant.genre
  );

  const nomComplet = [etudiant.nom, etudiant.prenom]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    civiliteMain,
    civiliteSup,
    nomComplet,
    dateNaissance: formatDateLong(etudiant.date_naissance),
    formation: formation.nom || "",
    ville: "Boumerdès",
    periode,
    dateSignature,
    numeroRef: generateNumeroRef(index),
  };
};