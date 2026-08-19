import { useState } from 'react';
import { MapPin, GraduationCap, PhoneCall, Radio, UserCheck } from 'lucide-react';
import ParametreValeurs from './ParametreValeurs';

const TABS = [
  { key: 'wilaya', label: 'Wilayas', Icon: MapPin },
  { key: 'niveau_scolaire', label: 'Niveaux scolaires', Icon: GraduationCap },
  { key: 'first_try', label: '1er appel', Icon: PhoneCall },
  { key: 'second_try', label: '2ème appel', Icon: PhoneCall },
  { key: 'third_try', label: '3ème appel', Icon: PhoneCall },
  { key: 'source', label: "Sources d'inscription", Icon: Radio },
  { key: 'registered_by', label: 'Rapporteur', Icon: UserCheck },
];

const ChampsUtilises = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-700 mb-4">Paramètre des champs utilisés</h2>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition ${
              activeTab === key ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <ParametreValeurs categorie={activeTab} />
    </div>
  );
};

export default ChampsUtilises;