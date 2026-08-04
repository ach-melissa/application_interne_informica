import AdminLayout from '../../../layouts/AdminLayout';
import { Settings } from 'lucide-react';

const Parametre = () => {
  return (
    <AdminLayout>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <Settings size={22} className="text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Paramètre</h1>
      </div>
    </AdminLayout>
  );
};

export default Parametre;