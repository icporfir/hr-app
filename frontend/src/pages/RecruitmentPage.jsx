// =====================================================================
// RecruitmentPage — modul de recrutare (în curând, backend urmează)
// =====================================================================

import { Briefcase, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card';

export default function RecruitmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recrutare</h1>
        <p className="text-sm text-gray-500 mt-1">
          Postare joburi și gestionare candidați.
        </p>
      </div>

      <Card className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto mb-4">
          <Briefcase size={28} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Modul în dezvoltare
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-4">
          Funcționalitatea de postare joburi și gestionare candidați va fi
          disponibilă în etapa următoare (Prompt 8 — Finalizare).
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-primary-700 font-medium">
          <Sparkles size={16} />
          Vine în curând
        </div>
      </Card>
    </div>
  );
}