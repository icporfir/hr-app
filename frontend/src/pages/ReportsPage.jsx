// =====================================================================
// ReportsPage — grafice și statistici detaliate (pentru MANAGER/ADMIN_HR)
// =====================================================================

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { statisticsService } from '../services/statisticsService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState([]);
  const [leavesByDept, setLeavesByDept] = useState([]);
  const [hoursThisWeek, setHoursThisWeek] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [t, l, h] = await Promise.all([
          statisticsService.attendanceTrend().catch(() => []),
          statisticsService.leavesByDepartment().catch(() => []),
          statisticsService.hoursThisWeek().catch(() => []),
        ]);
        setTrend(t);
        setLeavesByDept(l);
        setHoursThisWeek(h);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapoarte și statistici</h1>
        <p className="text-sm text-gray-500 mt-1">
          Indicatori cheie ai departamentului de resurse umane.
        </p>
      </div>

      {/* Prezență în ultimele 30 zile */}
      <Card title="Prezența angajaților — ultimele 30 zile" subtitle="Numărul de angajați prezenți pe zi">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#1E40AF" strokeWidth={2} name="Prezenți" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concedii pe dept */}
        <Card title="Concedii pe departamente" subtitle="Numărul de cereri aprobate luna curentă">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leavesByDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Ore lucrate / angajat săpt. curentă */}
        <Card title="Ore lucrate / angajat" subtitle="Săptămâna curentă">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hoursThisWeek} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}