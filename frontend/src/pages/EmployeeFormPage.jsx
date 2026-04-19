// =====================================================================
// EmployeeFormPage — formular adăugare / editare angajat
// Ruta /angajati/nou → creare
// Ruta /angajati/:id/editeaza → editare (opțional, dacă vrei)
// =====================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

// Valori inițiale pentru formular
const INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'ANGAJAT',
  position: '',
  departmentId: '',
  phone: '',
  hireDate: new Date().toISOString().slice(0, 10),
  salary: '',
};

export default function EmployeeFormPage() {
  const { id } = useParams(); // dacă există id → editare
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const depts = await employeeService.listDepartments();
        setDepartments(depts);

        if (isEdit) {
          const emp = await employeeService.getById(id);
          setForm({
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.user?.email || '',
            password: '', // nu populăm — se schimbă doar dacă vrei
            role: emp.user?.role || 'ANGAJAT',
            position: emp.position || '',
            departmentId: emp.departmentId || '',
            phone: emp.phone || '',
            hireDate: emp.hireDate?.slice(0, 10) || '',
            salary: emp.salary ?? '',
          });
        }
      } catch (err) {
        toast.error('Eroare la încărcarea datelor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Pregătim payload-ul — convertim tipurile unde e nevoie
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        position: form.position,
        phone: form.phone || null,
        departmentId: form.departmentId ? parseInt(form.departmentId, 10) : null,
        hireDate: form.hireDate,
        salary: form.salary ? parseFloat(form.salary) : null,
      };

      if (!isEdit) {
        // La creare — trimitem și datele contului
        payload.email = form.email;
        payload.password = form.password;
        payload.role = form.role;
      }

      if (isEdit) {
        await employeeService.update(id, payload);
        toast.success('Angajatul a fost actualizat.');
      } else {
        await employeeService.create(payload);
        toast.success('Angajat creat cu succes!');
      }

      navigate('/angajati');
    } catch (err) {
      const msg = err.response?.data?.message || 'Eroare la salvare.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/angajati')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} /> Înapoi la listă
      </button>

      <Card title={isEdit ? 'Editează angajat' : 'Adaugă angajat nou'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prenume *"
              value={form.firstName}
              onChange={handleChange('firstName')}
              required
            />
            <Input
              label="Nume *"
              value={form.lastName}
              onChange={handleChange('lastName')}
              required
            />
          </div>

          {!isEdit && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />
                <Input
                  label="Parolă inițială *"
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                  minLength={6}
                />
              </div>

              <Select
                label="Rol sistem *"
                value={form.role}
                onChange={handleChange('role')}
                options={[
                  { value: 'ANGAJAT', label: 'Angajat' },
                  { value: 'MANAGER', label: 'Manager' },
                  { value: 'ADMIN_HR', label: 'Admin HR' },
                ]}
                placeholder=""
                required
              />
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Funcție *"
              value={form.position}
              onChange={handleChange('position')}
              required
            />
            <Select
              label="Departament"
              value={form.departmentId}
              onChange={handleChange('departmentId')}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Telefon"
              value={form.phone}
              onChange={handleChange('phone')}
            />
            <Input
              label="Data angajării"
              type="date"
              value={form.hireDate}
              onChange={handleChange('hireDate')}
            />
            <Input
              label="Salariu (RON)"
              type="number"
              step="0.01"
              value={form.salary}
              onChange={handleChange('salary')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => navigate('/angajati')}
              type="button"
            >
              Anulează
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvează modificările' : 'Creează angajat'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}