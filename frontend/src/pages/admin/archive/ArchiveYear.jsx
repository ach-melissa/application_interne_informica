import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { ArrowLeft } from 'lucide-react';
import FormationsTab from './tabs/FormationsTab';
import UtilisateursTab from './tabs/UtilisateursTab';
import ProfsTab from './tabs/ProfsTab';
import StudentsTab from './tabs/StudentsTab';
import GroupesTab from './tabs/GroupesTab';

const tabs = ['Formations', 'Utilisateurs', 'Professeurs', 'Étudiants', 'Groupes'];

const ArchiveYear = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Formations');

  const renderTab = () => {
    switch (activeTab) {
      case 'Formations': return <FormationsTab />;
      case 'Utilisateurs': return <UtilisateursTab />;
      case 'Professeurs': return <ProfsTab />;
      case 'Étudiants': return <StudentsTab />;
      case 'Groupes': return <GroupesTab />;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/archive')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
        >
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Archive {year}</h1>
          <p className="text-[#64748B] text-sm">Année scolaire {year}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-xl w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {renderTab()}
    </AdminLayout>
  );
};

export default ArchiveYear;