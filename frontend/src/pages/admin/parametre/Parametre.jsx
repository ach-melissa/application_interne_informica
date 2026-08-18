import { useState } from 'react';
import { Settings } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import ChampsUtilises from './ChampsUtilises';

const SECTIONS = [
  { key: 'champs', label: 'Champs utilisés' },
  // { key: 'permissions', label: 'Permissions' }, // à venir
];

const Parametre = () => {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <Settings size={22} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Paramètres</h1>
      </div>

      {SECTIONS.length > 1 && (
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E2E8F0]">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === key
                  ? 'bg-[#DCEBFA] text-[#0369A1]'
                  : 'text-slate-500 hover:bg-[#F8FAFC]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'champs' && <ChampsUtilises />}
    </AdminLayout>
  );
};

export default Parametre;