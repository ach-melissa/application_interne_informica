import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AttestationDefault from "./templates/AttestationDefault";
import { mapEtudiantToAttestationFields } from "./attestationFields";

// Ajustez si votre backend n'est pas servi sur la même origine en prod.
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * AttestationPrintPage
 *
 * Ouverte dans un NOUVEL ONGLET via window.open() depuis AttestationsTab.
 * Comme ce nouvel onglet recharge toute l'app React depuis zéro, il n'a
 * pas accès au state du tab d'origine : tout passe par les query params
 * de l'URL, et les données sont récupérées via votre API backend (pas
 * Supabase directement, qui ne doit jamais être appelé depuis le navigateur).
 *
 *   /admin/formations/:formationId/groups/:groupId/attestations/print
 *     ?ids=id1,id2,id3&periode=...&dateSignature=...
 */
const AttestationPrintPage = () => {
  const [searchParams] = useSearchParams();

  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const periode = searchParams.get("periode") || "";
  const dateSignature = searchParams.get("dateSignature") || "";

  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!ids.length) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/inscriptions?ids=${encodeURIComponent(
            ids.join(",")
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401 || res.status === 403) {
          setError(
            "Session invalide ou expirée. Reconnectez-vous puis réessayez."
          );
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || body.message || "Erreur serveur");
        }

        const data = await res.json();
        setInscriptions(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const attestations = useMemo(() => {
    return inscriptions.map((inscription, index) =>
      mapEtudiantToAttestationFields(inscription, {
        periode,
        dateSignature,
        index,
      })
    );
  }, [inscriptions, periode, dateSignature]);

  useEffect(() => {
    if (!loading && attestations.length > 0) {
      const timer = setTimeout(() => setIsReady(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading, attestations.length]);

  const handlePrint = () => {
    window.print();
  };

  if (!ids.length) {
    return (
      <div className="p-10 text-center text-neutral-600">
        Aucun étudiant sélectionné. Fermez cet onglet et réessayez depuis la
        liste des attestations.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-neutral-600">
        Chargement des attestations…
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-200">
<div className="print:hidden sticky top-0 z-50 flex items-center gap-4 bg-neutral-100 border-b border-neutral-300 px-6 py-3">
        <span className="text-sm text-neutral-600">
          {attestations.length} attestation(s) prête(s)
        </span>

        <button
          onClick={handlePrint}
          disabled={!isReady}
          className="ml-auto bg-blue-700 text-white font-semibold rounded-md px-4 py-2 text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🖨️ Imprimer
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 py-6 print:gap-0 print:py-0 print:bg-white">
        {attestations.map((fields, idx) => (
          <AttestationDefault key={fields.numeroRef || idx} {...fields} />
        ))}
      </div>
    </div>
  );
};

export default AttestationPrintPage;