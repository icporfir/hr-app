// =====================================================================
// EmployeesPage — listă angajați cu search și filtrare pe departament
// =====================================================================

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [emps, depts] = await Promise.all([
          employeeService.list(),
          employeeService.listDepartments(),
        ]);
        setEmployees(emps);
        setDepartments(depts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtrare client-side (aplicația are 5-50 de angajați, e eficient)
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const matchesSearch = !search || fullName.includes(search.toLowerCase())
        || emp.position?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !deptFilter || emp.department?.name === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, search, deptFilter]);

  const columns = [
    {
      key: 'name',
      label: 'Angajat',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
            {row.firstName.charAt(0)}{row.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-gray-500">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'position', label: 'Funcție' },
    {
      key: 'department',
      label: 'Departament',
      render: (row) => row.department?.name || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.user?.isActive !== false ? 'green' : 'gray'}>
          {row.user?.isActive !== false ? 'Activ' : 'Inactiv'}
        </Badge>
      ),
    },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Angajați</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} {filtered.length === 1 ? 'angajat' : 'angajați'}
          </p>
        </div>
        {isAdmin() && (
          <Button onClick={() => navigate('/angajati/nou')}>
            <Plus size={18} />
            Adaugă angajat
          </Button>
        )}
      </div>

      {/* Filtre */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după nume sau funcție..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <Select
          options={departments.map((d) => ({ value: d.name, label: d.name }))}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          placeholder="Toate departamentele"
        />
      </div>

      {/* Tabel */}
      <Table
        columns={columns}
        data={filtered}
        emptyMessage="Nu s-au găsit angajați."
        onRowClick={(row) => navigate(`/angajati/${row.id}`)}
      />
    </div>
  );
}