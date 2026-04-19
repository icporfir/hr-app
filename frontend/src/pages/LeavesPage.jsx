// =====================================================================
// Pagina /concedii — lista cererilor + tab calendar vizual
// Include buton Export Excel pentru ADMIN_HR și MANAGER
// =====================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Check, X, Download, List, Calendar as CalendarIcon } from 'lucide-react';
import { leaveService } from '../services/leaveService';
import { useAuth } from '../context/AuthContext';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Badge, { leaveStatusLabel, leaveStatusVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LeaveCalendar from '../components/leaves/LeaveCalendar';

// Etichete prietenoase pentru tipurile de concediu
const LEAVE_TYPE_LABELS = {
  ODIHNA:                  'Odihnă',
  MEDICAL:                 'Medical',
  FARA_PLATA:              'Fără plată',
  MATERNITATE_PATERNITATE: 'Maternitate/Paternitate',
  STUDII:                  'Studii',
  // Fallback pentru tipuri vechi din seed
  MATERNITATE:             'Maternitate',
  EVENIMENT:               'Eveniment',
};

export default function LeavesPage() {
  const navigate = useNavigate();
  const { isEmployee, hasRole } = useAuth();
  const canApprove = hasRole('MANAGER', 'ADMIN_HR');
  const canExport  = hasRole('MANAGER', 'ADMIN_HR');

  // State general
  const [activeTab, setActiveTab] = useState('list'); // 'list' sau 'calendar'
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, leaveId: null, reason: '' });
  const [exporting, setExporting] = useState(false);

  // ------------------------------------------------------------------
  // Încărcare cereri (doar pentru tabul "Listă")
  // ------------------------------------------------------------------
  const loadLeaves = async () => {
    setLoading(true);
    try {
      const data = await leaveService.list(statusFilter ? { status: statusFilter } : {});
      setLeaves(data);
    } catch {
      toast.error('Eroare la încărcarea cererilor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeTab]);

  // ------------------------------------------------------------------
  // Aprobare cerere
  // ------------------------------------------------------------------
  const handleApprove = async (id) => {
    try {
      await leaveService.approve(id);
      toast.success('Cerere aprobată.');
      loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eroare la aprobare.');
    }
  };

  // ------------------------------------------------------------------
  // Respingere cerere (cu motiv obligatoriu)
  // ------------------------------------------------------------------
  const handleReject = async () => {
    try {
      await leaveService.reject(rejectModal.leaveId, rejectModal.reason);
      toast.success('Cerere respinsă.');
      setRejectModal({ open: false, leaveId: null, reason: '' });
      loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eroare la respingere.');
    }
  };

  // ------------------------------------------------------------------
  // Export Excel — respectă filtrul de status curent
  // ------------------------------------------------------------------
  const handleExport = async () => {
    setExporting(true);
    try {
      await leaveService.exportExcel(statusFilter ? { status: statusFilter } : {});
      toast.success('Export generat cu succes.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eroare la export.');
    } finally {
      setExporting(false);
    }
  };

  // ------------------------------------------------------------------
  // Definire coloane tabel
  // ------------------------------------------------------------------
  const columns = [
    {
      key: 'employee', label: 'Angajat',
      render: (row) => row.employee
        ? `${row.employee.firstName} ${row.employee.lastName}`
        : '—',
    },
    {
      key: 'leaveType', label: 'Tip',
      render: (row) => LEAVE_TYPE_LABELS[row.leaveType || row.type] || row.leaveType || row.type,
    },
    {
      key: 'period', label: 'Perioadă',
      render: (row) => {
        const fmt = (d) => new Date(d).toLocaleDateString('ro-RO');
        return `${fmt(row.startDate)} → ${fmt(row.endDate)}`;
      },
    },
    { key: 'daysCount', label: 'Zile' },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <Badge variant={leaveStatusVariant(row.status)}>
          {leaveStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row) => {
        if (!canApprove || row.status !== 'IN_ASTEPTARE') return null;
        return (
          <div className="flex gap-1">
            <button
              onClick={() => handleApprove(row.id)}
              className="p-1.5 rounded hover:bg-green-50 text-green-600"
              title="Aprobă"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setRejectModal({ open: true, leaveId: row.id, reason: '' })}
              className="p-1.5 rounded hover:bg-red-50 text-red-600"
              title="Respinge"
            >
              <X size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  // Dacă user-ul e ANGAJAT, ascundem coloana "Angajat" (sunt toate ale lui)
  const visibleColumns = isEmployee()
    ? columns.filter((c) => c.key !== 'employee')
    : columns;

  return (
    <div className="space-y-6">
      {/* Header pagină */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cereri de concediu</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'list'
              ? `${leaves.length} ${leaves.length === 1 ? 'cerere' : 'cereri'}`
              : 'Calendar vizual — concedii aprobate'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Butonul de export apare doar pe tabul "Listă" și doar pentru MANAGER/ADMIN_HR */}
          {canExport && activeTab === 'list' && (
            <Button variant="secondary" onClick={handleExport} loading={exporting}>
              <Download size={18} /> Export Excel
            </Button>
          )}
          <Button onClick={() => navigate('/concedii/cerere-noua')}>
            <Plus size={18} /> Cerere nouă
          </Button>
        </div>
      </div>

      {/* Tab-uri Listă / Calendar */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`
            flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition
            ${activeTab === 'list'
              ? 'border-primary-700 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'}
          `}
        >
          <List size={16} /> Listă
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`
            flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition
            ${activeTab === 'calendar'
              ? 'border-primary-700 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'}
          `}
        >
          <CalendarIcon size={16} /> Calendar
        </button>
      </div>

      {/* Conținut tab */}
      {activeTab === 'list' ? (
        <>
          <div className="max-w-xs">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'IN_ASTEPTARE', label: 'În așteptare' },
                { value: 'APROBATA',     label: 'Aprobate' },
                { value: 'RESPINSA',     label: 'Respinse' },
                { value: 'ANULATA',      label: 'Anulate' },
              ]}
              placeholder="Toate statusurile"
            />
          </div>

          {loading ? <Spinner /> : (
            <Table
              columns={visibleColumns}
              data={leaves}
              emptyMessage="Nicio cerere găsită."
            />
          )}
        </>
      ) : (
        <LeaveCalendar />
      )}

      {/* Modal respingere cerere */}
      <Modal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, leaveId: null, reason: '' })}
        title="Respinge cererea"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Te rugăm să specifici motivul respingerii (va fi vizibil pentru angajat).
          </p>
          <textarea
            value={rejectModal.reason}
            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            rows={4}
            className="input-field"
            placeholder="Ex: Perioada coincide cu deadline-ul proiectului X..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ open: false, leaveId: null, reason: '' })}
            >
              Anulează
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectModal.reason.trim()}
            >
              Respinge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}