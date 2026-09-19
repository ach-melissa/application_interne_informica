// ChargesAutre.jsx
import ComptableLayout from '../../../layouts/ComptableLayout';
import { Receipt } from 'lucide-react';
import ChargesBase from './ChargesBase';

const ChargesAutre = () => (
  <ComptableLayout>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
        <Receipt size={22} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">Autre charge</h1>
    </div>
    <ChargesBase type="autre" />
  </ComptableLayout>
);

export default ChargesAutre;