import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Award, DollarSign, Percent, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import ConversationalAnalytics from '../components/ConversationalAnalytics';

const PIE_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#9a3412', '#dc2626'];

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [dashRes, campRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/campaigns'),
      ]);
      setDashboard(dashRes.data);
      setCampaigns(campRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      if (isManual) setRefreshing(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!dashboard) {
    return <div className="empty-state"><p>Failed to load analytics.</p></div>;
  }

  const { summary } = dashboard;

  const funnelData = [
    { name: 'Sent', value: summary.totalSent, color: '#171717' },
    { name: 'Delivered', value: summary.totalDelivered, color: '#404040' },
    { name: 'Opened', value: summary.totalOpened, color: '#737373' },
    { name: 'Clicked', value: summary.totalClicked, color: '#a3a3a3' },
    { name: 'Converted', value: summary.totalConverted, color: '#16a34a' },
  ];

  const statusPieData = [
    { name: 'Delivered', value: summary.totalDelivered - summary.totalOpened, color: '#404040' },
    { name: 'Opened', value: summary.totalOpened - summary.totalClicked, color: '#737373' },
    { name: 'Clicked', value: summary.totalClicked - summary.totalConverted, color: '#a3a3a3' },
    { name: 'Converted', value: summary.totalConverted, color: '#16a34a' },
    { name: 'Failed', value: summary.totalFailed, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const deliveryRate = summary.totalSent > 0 ? ((summary.totalDelivered / summary.totalSent) * 100).toFixed(1) : 0;
  const conversionRate = summary.totalSent > 0 ? ((summary.totalConverted / summary.totalSent) * 100).toFixed(1) : 0;
  const roi = summary.campaignRevenue > 0 ? (summary.campaignRevenue / (summary.totalSent * 1.5)).toFixed(1) : 0;

  const getChannelClass = (channel) => {
    const map = { email: 'channel-email', whatsapp: 'channel-whatsapp', sms: 'channel-sms', rcs: 'channel-rcs' };
    return map[channel] || 'badge-neutral';
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Analytics Workspace</h2>
          <p>End-to-end communication performance, conversion rates, and ROI metrics</p>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => fetchData(true)} 
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Conversational Analytics panel */}
      <div className="mb-6">
        <ConversationalAnalytics />
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {[
          { label: 'Total Sent', value: summary.totalSent.toLocaleString() },
          { label: 'Delivered', value: summary.totalDelivered.toLocaleString() },
          { label: 'Opened', value: summary.totalOpened.toLocaleString() },
          { label: 'Clicked', value: summary.totalClicked.toLocaleString() },
          { label: 'Converted', value: summary.totalConverted.toLocaleString() },
          { label: 'Campaign Revenue', value: formatCurrency(summary.campaignRevenue) },
          { label: 'Conversion Rate', value: `${conversionRate}%` },
          { label: 'ROI Multiplier', value: `${roi}x` },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{stat.label}</span>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-6">
        {/* Delivery Funnel */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>End-to-End Delivery & Conversion Funnel</span>
          </div>
          <div style={{ paddingTop: '16px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #171717',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Status Distribution Breakdown</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingTop: '16px' }}>
            <ResponsiveContainer width="50%" height={260}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #171717',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {statusPieData.map((entry) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{entry.name}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Trend */}
      {dashboard.performance.length > 0 && (
        <div className="card mb-6">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Campaign Performance & Conversion Trend</span>
          </div>
          <div style={{ paddingTop: '16px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dashboard.performance} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #171717',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="delivered" stroke="#404040" strokeWidth={2} dot={{ r: 2 }} name="Delivered" />
                <Line type="monotone" dataKey="opened" stroke="#737373" strokeWidth={2} dot={{ r: 2 }} name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#a3a3a3" strokeWidth={2} dot={{ r: 2 }} name="Clicked" />
                <Line type="monotone" dataKey="converted" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} name="Converted" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Campaign Analytics Table */}
      <div className="table-container">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)' }}>
          <span className="card-title" style={{ fontWeight: 600 }}>Campaign Performance Breakdown</span>
        </div>
        <table className="table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Channel</th>
              <th>Sent</th>
              <th>Delivered %</th>
              <th>Open %</th>
              <th>Click %</th>
              <th>Conv %</th>
              <th>Revenue</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(camp => {
              const estCost = camp.total_sent * 1.5;
              const roiVal = camp.revenue > 0 ? `${(camp.revenue / estCost).toFixed(1)}x` : '0.0x';

              return (
                <tr key={camp.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{camp.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{camp.segment_name}</div>
                  </td>
                  <td><span className={`channel-tag ${getChannelClass(camp.channel)}`}>{camp.channel}</span></td>
                  <td>{camp.total_sent}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                      {camp.delivery_rate}%
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                      {camp.open_rate}%
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                      {camp.click_rate}%
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success" style={{ fontWeight: 600 }}>
                      {camp.conversion_rate}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(camp.revenue)}</td>
                  <td style={{ fontWeight: 600 }}>{roiVal}</td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>No completed campaigns yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
