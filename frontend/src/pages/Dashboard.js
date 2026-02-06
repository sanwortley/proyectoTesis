// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Trophy, Users, CheckCircle, Clock, UserCheck, ClipboardList
} from 'lucide-react';
import './dashboard.css';
// ... (existing helper functions)

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Hace menos de un minuto';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} horas`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Hace ${diffInDays} días`;
}

// ... (inside Dashboard component)


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FFD700', '#A200FF'];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [torneosStatus, setTorneosStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, statsRes, alertsRes, statusRes] = await Promise.all([
          axios.get('/api/dashboard/kpis'),
          axios.get('/api/dashboard/stats'),
          axios.get('/api/dashboard/alerts'),
          axios.get('/api/dashboard/torneos-status')
        ]);

        setKpis(kpiRes.data);
        setStats(statsRes.data);
        setAlerts(alertsRes.data);
        setTorneosStatus(statusRes.data);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="dashboard-container">Cargando dashboard...</div>;

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard del Organizador</h1>

      {/* 1. KPIs */}
      {kpis && (
        <div className="kpi-grid">
          <KpiCard label="Torneos Activos" value={kpis.torneosActivos} icon={<Trophy size={28} color="#FFD700" />} />
          <KpiCard label="Equipos Inscriptos" value={kpis.equiposInscriptos} icon={<Users size={28} color="#FFD700" />} />
          <KpiCard label="Partidos Jugados" value={kpis.partidosJugados} icon={<CheckCircle size={28} color="#FFD700" />} />
          <KpiCard label="Partidos Pendientes" value={kpis.partidosPendientes} icon={<Clock size={28} color="#FFD700" />} />
          <KpiCard label="Jugadores" value={kpis.jugadoresRegistrados} icon={<UserCheck size={28} color="#FFD700" />} />
        </div>
      )}

      <div className="dashboard-layout">
        <div className="dashboard-main">
          {/* 2. Estado de Torneos */}
          <div className="section-container">
            <h2 className="section-title">Estado de Torneos</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="tournament-table">
                <thead>
                  <tr>
                    <th>Torneo</th>
                    <th>Categoría</th>
                    <th>Inicio</th>
                    <th>Ocupación</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {torneosStatus.map(t => (
                    <tr key={t.id_torneo}>
                      <td>{t.nombre_torneo}</td>
                      <td>{t.categoria || '-'}</td>
                      <td>{new Date(t.fecha_inicio).toLocaleDateString()}</td>
                      <td>
                        <OccupancyBar current={parseInt(t.inscriptos)} max={t.max_equipos} />
                      </td>
                      <td>
                        <span className={`status-badge status-${getStatusClass(t.estado)}`}>
                          {t.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {torneosStatus.length === 0 && (
                    <tr><td colSpan="5">No hay torneos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {stats && (
            <div className="charts-grid">
              {/* A. Equipos por Categoría - TOP POPULARIDAD */}
              <div className="chart-container">
                <h3 className="section-title">Top Categorías</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.equiposPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="cantidad"
                        nameKey="categoria"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                          const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                          return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {stats.equiposPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* B. Estado de Partidos */}
              <div className="chart-container">
                <h3 className="section-title">Progreso de Partidos</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.estadoPartidos}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.estadoPartidos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* C. Evolución Inscripciones */}
              <div className="chart-container full-width-chart">
                <h3 className="section-title">Evolución de Inscripciones</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.evolucionInscripciones}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="fecha" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }} />
                      <Line type="monotone" dataKey="cantidad" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: Alertas + Feed */}
        <div className="dashboard-sidebar">
          {/* 4. Alertas */}
          <div className="section-container">
            <h2 className="section-title">Alertas</h2>
            <div className="alerts-list">
              {alerts.map((a, idx) => (
                <div key={idx} className={`alert-item ${a.type}`}>
                  <span className="alert-title">{a.type === 'error' ? '⛔ Atención' : '⚠️ Aviso'}</span>
                  <span className="alert-msg">{a.message}</span>
                </div>
              ))}
              {alerts.length === 0 && <p style={{ color: '#aaa' }}>No hay alertas pendientes.</p>}
            </div>
          </div>

          {/* 5. Feed de Actividad */}
          <div className="section-container">
            <h2 className="section-title">Actividad Reciente</h2>
            <div className="activity-feed">
              {stats && stats.actividadReciente && stats.actividadReciente.length > 0 ? (
                stats.actividadReciente.map((act, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-icon-wrapper">
                      <ClipboardList size={20} color="#FFD700" />
                    </div>
                    <div className="activity-content">
                      <p className="activity-text">
                        <span className="team-highlight">{act.nombre_equipo}</span>
                        <span className="activity-action"> se inscribió en </span>
                        <span className="tournament-highlight">{act.nombre_torneo}</span>
                      </p>
                      <div className="activity-meta">
                        <span className="category-tag">{act.categoria}</span>
                        <span className="activity-dot">•</span>
                        <span className="activity-time">{formatTimeAgo(act.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#aaa', padding: '10px' }}>No hay actividad reciente.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-wrapper" style={{ marginBottom: '10px' }}>{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function OccupancyBar({ current, max }) {
  const percentage = Math.min((current / max) * 100, 100);
  const color = percentage >= 100 ? '#ef4444' : percentage >= 80 ? '#f59e0b' : '#10b981';

  return (
    <div className="occupancy-wrapper">
      <div className="occupancy-text">{current} / {max}</div>
      <div className="occupancy-track">
        <div
          className="occupancy-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function getStatusClass(estado) {
  if (estado === 'Inscripción abierta') return 'abierta';
  if (estado === 'En curso') return 'curso';
  return 'finalizado';
}
