// ChargesFormation.jsx
import ComptableLayout from '../../../layouts/ComptableLayout';
import { Receipt } from 'lucide-react';
import ChargesBase from './ChargesBase';

const ChargesFormation = () => (
  <ComptableLayout>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
        <Receipt size={22} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">Charges de formation</h1>
    </div>
    <ChargesBase type="formation" />
  </ComptableLayout>
);

export default ChargesFormation;