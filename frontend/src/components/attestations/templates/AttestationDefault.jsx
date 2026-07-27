import React from "react";
import informicaLogo from "../../../assets/images/logo.png";
import borderFrame from "../../../assets/images/border-frame.png";

/**
 * Retourne {main, sup} pour la civilité abrégée avec exposant
 * (ex: "M" + "elle" pour Mademoiselle, "M" + "me" pour Madame, "M" + "r" pour Monsieur).
 */
export const getCivilite = (genre) => {
  switch (genre) {
    case "femme":
      return { main: "M", sup: "elle" }; // Melle
    case "madame":
      return { main: "M", sup: "me" }; // Mme
    default:
      return { main: "M", sup: "r" }; // Mr / Monsieur
  }
};

/**
 * AttestationDefault
 * Reproduction fidèle du modèle Word "Attestation de formation" INFORMICA.
 *
 * Bordure : image unique du cadre complet (motif guilloché), positionnée en
 * fond plein cadre (object-fit: fill — le ratio de l'image, ~1.43, est très
 * proche du ratio A4 paysage 1.414, donc pas de déformation visible).
 * Le contenu est ensuite padded vers l'intérieur pour ne pas chevaucher le
 * dessin de la bordure.
 */
const AttestationDefault = ({
  civiliteMain = "M",
  civiliteSup = "elle",
  nomComplet = "",
  dateNaissance = "",
  formation = "",
  ville = "Boumerdès",
  periode = "",
  dateSignature = "",
  numeroRef = "",
}) => {
return (
  <>
<style>{`
  @page {
    size: landscape;
    margin: 0;
  }
`}</style>

<div className="w-[297mm] h-[210mm] box-border bg-white mx-auto break-after-page p-[10mm]">
<div className="attestation-page relative w-[277mm] h-[190mm] box-border bg-white mx-auto break-after-page overflow-hidden border-[12px] border-[#E2E8F0] outline outline-[4px] outline-offset-[-12px] outline-[#0056B3]">

  {/* Cadre décoratif - inset symétrique (8mm de chaque côté) : la marge blanche de l'image est en réalité quasi uniforme (~6.2-6.4%) */}
  <img
    src={borderFrame}
    alt=""
    aria-hidden="true"
    className="absolute inset-0 w-full h-full object-fill scale-110 pointer-events-none select-none"
  
  />

      {/* Contenu intérieur - padding pour rester à l'intérieur du cadre dessiné */}
{/* Contenu intérieur - padding pour rester à l'intérieur du cadre dessiné */}
<div className="relative z-10 h-full flex flex-col font-sans text-neutral-900 text-[13px] px-[26mm] py-[14mm]">
  {/* Logo + titre */}
  <div className="flex flex-col items-center text-center">
    <img
      src={informicaLogo}
      alt="INFORMICA"
      className="h-30 w-auto object-contain"
    />

    <h1 className="text-3xl font-extrabold text-[#0056B3] tracking-wide mt-2">
      ATTESTATION DE FORMATION
    </h1>
    <p className="text-xs mt-1">Réf : N°{numeroRef}</p>
  </div>

  {/* Corps - prend l'espace restant et centre son contenu */}
  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 text-[20px]">
    <p>Délivrée à :</p>

    <p>
      {civiliteMain}
      <sup>{civiliteSup}</sup>. {nomComplet} né(e) le {dateNaissance}.
    </p>

    <p>A suivi la formation intitulée « {formation} »</p>

    <p>
      Organisée à INFORMICA. <u>{ville}</u> du {periode}.
    </p>
  </div>

  {/* Signature */}
  <div className="flex justify-end pr-20">
    <div className="text-center text-[16px] text-neutral-900 ">
      <p >
        <u>{ville}</u> le : {dateSignature}
      </p>
      <p>Le Directeur Général</p>
    </div>
  </div>

  {/* Footer / coordonnées */}
  <div className="text-center text-[13px] text-neutral-900 font-semibold border-t border-neutral-300 pt-1 mt-20">
    
    <p>
      Cité <u>Alliliguia</u>, Groupement PR. N°1224, N°01- 2-ème
      étage. Boumerdès. Tél. /Fax : 024 79 97 67 / Mobile :
      0661 83 23 78 - 0560 606 896
    </p>
    <p>RC N° 35/00-3671752A16 / E-mail : informicadz@gmail.com</p>
  </div>
</div>
    </div>
    </div>
  </>
);
};

export default AttestationDefault;