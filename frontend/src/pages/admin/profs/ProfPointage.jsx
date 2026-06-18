import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const statutLabel = (s) => {
  if (s === 'present') return 'P';
  if (s === 'absent') return 'A';
  if (s === 'retard') return 'R';
  return '';
};

const statutColor = (s) => {
  if (s === 'present') return '#166534';
  if (s === 'absent') return '#991b1b';
  if (s === 'retard') return '#9a3412';
  return '#94a3b8';
};

const MAX_ROWS = 18;
const MAX_COLS = 15;

const ProfPointage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const group_id = searchParams.get('group_id');
  const group_nom = searchParams.get('group_nom');
  const formation = searchParams.get('formation');

  const [sessions, setSessions] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [profInfo, setProfInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/profs/${id}/pointage?group_id=${group_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setSessions(data.sessions || []);
        setEtudiants((data.inscriptions || []).map((i) => i.etudiant));
        setAttendance(data.attendance || []);
        setProfInfo(data.prof ?? null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (group_id) fetchData();
  }, [id, group_id]);

  const getStatut = (etudiant_id, session_id) => {
    const record = attendance.find(
      (a) => a.etudiant_id === etudiant_id && a.session_id === session_id
    );
    return record?.statut ?? null;
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatShort = (dateStr) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const firstDate = sessions.length > 0 ? formatDate(sessions[0].date) : '';
  const lastDate = sessions.length > 0 ? formatDate(sessions[sessions.length - 1].date) : '';
  const profName = profInfo ? `${profInfo.nom} ${profInfo.prenom}` : '';

  // We show up to MAX_COLS sessions, and always show MAX_ROWS student rows
  const displayedSessions = sessions.slice(0, MAX_COLS);
  const colCount = Math.max(displayedSessions.length, 1);

  // Pad student list to MAX_ROWS
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => etudiants[i] ?? null);

  const tdStyle = {
    border: '1px solid #555',
    padding: '2px 3px',
    textAlign: 'center',
    fontSize: '10px',
    height: '22px',
    whiteSpace: 'nowrap',
  };

  const labelTdStyle = {
    border: '1px solid #555',
    padding: '2px 6px',
    fontSize: '9px',
    color: '#333',
    height: '22px',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  const nameTdStyle = {
    border: '1px solid #555',
    padding: '2px 6px',
    fontSize: '10px',
    height: '24px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <AdminLayout>
      {/* Screen-only toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/profs')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} className="text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Fiche de pointage</h1>
            <p className="text-[#64748B] text-sm mt-0.5">
              {formation} — {group_nom} · {sessions.length} séance(s)
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition text-[#64748B]"
        >
          <Printer size={15} />
          Imprimer
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 print:hidden">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 print:hidden">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* ===================== PRINT DOCUMENT ===================== */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #fiche-pointage, #fiche-pointage * { visibility: visible !important; }
              #fiche-pointage { position: fixed; top: 0; left: 0; width: 100%; }
            }
            @page { size: A4 landscape; margin: 10mm; }
          `}</style>

          <div
            id="fiche-pointage"
            style={{
              fontFamily: 'Arial, sans-serif',
              background: '#fff',
              color: '#000',
              padding: '12px 16px',
              maxWidth: '100%',
            }}
          >
            {/* TITLE */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', textDecoration: 'underline' }}>
              Fiche de pointage
            </div>

            {/* HEADER INFO */}
            <div style={{ marginBottom: '8px', fontSize: '11px', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span>
                  <strong>Formation :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '120px', display: 'inline-block', paddingBottom: '1px' }}>
                    {formation}
                  </span>
                </span>
                <span>
                  <strong>Date de début :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block', paddingBottom: '1px' }}>
                    {firstDate}
                  </span>
                </span>
                <span>
                  <strong>Date de fin :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block', paddingBottom: '1px' }}>
                    {lastDate}
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '2px' }}>
                <span>
                  <strong>Enseignant :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '140px', display: 'inline-block', paddingBottom: '1px' }}>
                    {profName}
                  </span>
                </span>
                <span>
                  <strong>Jour(s) de formation :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block', paddingBottom: '1px' }}>
                    &nbsp;
                  </span>
                </span>
                <span>
                  <strong>Heure :</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', minWidth: '70px', display: 'inline-block', paddingBottom: '1px' }}>
                    &nbsp;
                  </span>
                </span>
              </div>
            </div>

            {/* MAIN TABLE */}
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                {/* Row label column */}
                <col style={{ width: '110px' }} />
                {/* Session columns */}
                {Array.from({ length: colCount }).map((_, i) => (
                  <col key={i} style={{ width: `${Math.floor(620 / colCount)}px` }} />
                ))}
              </colgroup>

              <tbody>
                {/* ---- Header row: séance numbers ---- */}
                <tr>
                  <td style={{ ...labelTdStyle, fontWeight: 'bold', fontSize: '8px', verticalAlign: 'bottom' }}>
                    Séance №
                  </td>
                  {displayedSessions.map((_, idx) => (
                    <td key={idx} style={{ ...tdStyle, fontWeight: 'bold' }}>
                      {idx + 1}
                    </td>
                  ))}
                </tr>

                {/* ---- Row 1: Date de la Séance ---- */}
                <tr>
                  <td style={labelTdStyle}>Date de la Séance</td>
                  {displayedSessions.map((s) => (
                    <td key={s.id} style={{ ...tdStyle, fontSize: '8px' }}>
                      {formatShort(s.date)}
                    </td>
                  ))}
                </tr>

                {/* ---- Row 2: Durée de la Séance ---- */}
                <tr>
                  <td style={labelTdStyle}>Durée de la Séance</td>
                  {displayedSessions.map((s) => (
                    <td key={s.id} style={tdStyle}>&nbsp;</td>
                  ))}
                </tr>

                {/* ---- Row 3: Nombre des stagiaires ---- */}
                <tr>
                  <td style={labelTdStyle}>Nombre des stagiaires</td>
                  {displayedSessions.map((s) => {
                    const nb = attendance.filter(
                      (a) => a.session_id === s.id && a.statut === 'present'
                    ).length;
                    return (
                      <td key={s.id} style={{ ...tdStyle, fontWeight: 'bold' }}>
                        {nb > 0 ? nb : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Row 4: Emargement de l'enseignant ---- */}
                <tr>
                  <td style={labelTdStyle}>Emargement de l'enseignant</td>
                  {displayedSessions.map((s) => (
                    <td key={s.id} style={{ ...tdStyle, height: '28px' }}>&nbsp;</td>
                  ))}
                </tr>

                {/* ---- Row 5: Emargement des stagiaires ---- */}
                <tr>
                  <td style={labelTdStyle}>Emargement des stagiaires</td>
                  {displayedSessions.map((s) => (
                    <td key={s.id} style={{ ...tdStyle, height: '28px' }}>&nbsp;</td>
                  ))}
                </tr>

                {/* ---- Student rows ---- */}
                {rows.map((e, idx) => {
                  const statuts = displayedSessions.map((s) =>
                    e ? getStatut(e.id, s.id) : null
                  );
                  return (
                    <tr key={idx}>
                      <td style={nameTdStyle}>
                        <span style={{ color: '#555', marginRight: '4px' }}>{idx + 1})</span>
                        {e ? `${e.nom} ${e.prenom}` : ''}
                      </td>
                      {statuts.map((s, sIdx) => (
                        <td
                          key={sIdx}
                          style={{
                            ...tdStyle,
                            fontWeight: 'bold',
                            color: statutColor(s),
                          }}
                        >
                          {statutLabel(s)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* ===================== END PRINT DOCUMENT ===================== */}
        </>
      )}
    </AdminLayout>
  );
};

export default ProfPointage;