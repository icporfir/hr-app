// =====================================================================
// EmployeeDetailPage — profil angajat (date personale + date contact)
// Admin HR poate și edita / dezactiva contul
// =====================================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, Briefcase, Building2 } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeService.getById(id);
        setEmployee(data);
      } catch {
        toast.error('Angajat negăsit.');
        navigate('/angajati');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleDelete = async () => {
    try {
      await employeeService.remove(id);
      toast.success('Contul a fost dezactivat.');
      navigate('/angajati');
    } catch {
      toast.error('Eroare la dezactivare.');
    }
  };

  if (loading) return <Spinner />;
  if (!employee) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <button
        onClick={() => navigate('/angajati')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> Înapoi la listă
      </button>

      {/* Header cu nume și acțiuni */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-700 text-white flex items-center justify-center text-xl font-bold">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-gray-600">{employee.position}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={employee.user?.isActive !== false ? 'green' : 'gray'}>
                  {employee.user?.isActive !== false ? 'Activ' : 'Inactiv'}
                </Badge>
                <Badge variant="blue">{employee.user?.role}</Badge>
              </div>
            </div>
          </div>

          {isAdmin() && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/angajati/${id}/editeaza`)}>
                <Edit size={16} /> Editează
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} /> Dezactivează
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Grid cu informații */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Informații contact">
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={employee.user?.email} />
            <InfoRow icon={Phone} label="Telefon" value={employee.phone || '—'} />
          </div>
        </Card>

        <Card title="Informații angajare">
          <div className="space-y-3">
            <InfoRow icon={Briefcase} label="Funcție" value={employee.position} />
            <InfoRow icon={Building2} label="Departament" value={employee.department?.name || '—'} />
            <InfoRow
              icon={Calendar}
              label="Data angajării"
              value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ro-RO') : '—'}
            />
            {employee.salary !== null && employee.salary !== undefined && (
              <InfoRow
                icon={Briefcase}
                label="Salariu"
                value={`${Number(employee.salary).toLocaleString('ro-RO')} RON`}
              />
            )}
          </div>
        </Card>

        <Card title="Soldul de concediu">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary-700">
              {employee.vacationDaysLeft ?? '—'}
            </span>
            <span className="text-gray-500">zile rămase din {employee.vacationDaysTotal ?? 21}</span>
          </div>
        </Card>

        {employee.manager && (
          <Card title="Manager direct">
            <p className="text-gray-900 font-medium">
              {employee.manager.firstName} {employee.manager.lastName}
            </p>
          </Card>
        )}
      </div>

      {/* Modal confirmare ștergere */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmare dezactivare"
      >
        <p className="text-gray-700 mb-6">
          Ești sigur că vrei să dezactivezi contul pentru <strong>{employee.firstName} {employee.lastName}</strong>?
          Contul poate fi reactivat ulterior de HR.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Anulează
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Da, dezactivează
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-gray-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}