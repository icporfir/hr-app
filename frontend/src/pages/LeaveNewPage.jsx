// =====================================================================
// LeaveNewPage — formular depunere cerere concediu
// =====================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { leaveService } from '../services/leaveService';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

export default function LeaveNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
  leaveType: 'ODIHNA',
  startDate: '',
  endDate: '',
  reason: '',
});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validare simplă pe client
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('Data de sfârșit trebuie să fie după data de început.');
      return;
    }

    setSubmitting(true);
    try {
      await leaveService.create(form);
      toast.success('Cererea a fost depusă!');
      navigate('/concedii');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eroare la trimitere.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/concedii')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} /> Înapoi
      </button>

      <Card title="Cerere nouă de concediu">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
  label="Tipul concediului *"
  value={form.leaveType}
  onChange={handleChange('leaveType')}
            placeholder=""
            required
            options={[
              { value: 'ODIHNA',                  label: 'Odihnă' },
              { value: 'MEDICAL',                 label: 'Medical' },
              { value: 'FARA_PLATA',              label: 'Fără plată' },
              { value: 'MATERNITATE_PATERNITATE', label: 'Maternitate/Paternitate' },
              { value: 'STUDII',                  label: 'Studii' },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="De la *"
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
              min={new Date().toISOString().slice(0, 10)}
              required
            />
            <Input
              label="Până la *"
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
              min={form.startDate || new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div>
            <label className="label-field">Motiv</label>
            <textarea
              value={form.reason}
              onChange={handleChange('reason')}
              rows={3}
              className="input-field"
              placeholder="Descrie pe scurt motivul cererii..."
            />
          </div>

          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">
            ℹ️ Numărul de zile lucrătoare se calculează automat (exclude weekend-urile).
            Cererea va fi trimisă managerului tău pentru aprobare.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" type="button" onClick={() => navigate('/concedii')}>
              Anulează
            </Button>
            <Button type="submit" loading={submitting}>
              Trimite cererea
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}