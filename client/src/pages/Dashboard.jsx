import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Users, Target, Megaphone, TrendingUp, MousePointerClick, IndianRupee, Sparkles, ArrowUpRight, Zap, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import MarketingIntelligenceHub from '../components/MarketingIntelligenceHub';

const CHART_COLORS = ['#171717', '#404040', '#737373', '#a3a3a3'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      if (isManual) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!data) {
    return <div className="empty-state"><p>Failed to load dashboard data.</p></div>;
  }

  const { 
    summary, 
    recentCampaigns, 
    performance, 
    topSegments, 
    channelDistribution,
    aiInsights = [],
    revenueForecast = [],
    bestChannels = [],
    segmentPerformance = []
  } = data;

  const formatCurrency = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  const stats = [
    { label: 'Total Customers', value: summary.totalCustomers.toLocaleString(), icon: Users },
    { label: 'Active Segments', value: summary.activeSegments, icon: Target },
    { label: 'Campaigns Sent', value: summary.campaignsSent, icon: Megaphone },
    { label: 'Open Rate', value: `${summary.openRate}%`, icon: TrendingUp },
    { label: 'Click Rate', value: `${summary.clickRate}%`, icon: MousePointerClick },
    { label: 'Store Revenue', value: formatCurrency(summary.totalRevenue), icon: IndianRupee },
  ];

  const getChannelClass = (channel) => {
    const map = { email: 'channel-email', whatsapp: 'channel-whatsapp', sms: 'channel-sms', rcs: 'channel-rcs' };
    return map[channel] || 'badge-neutral';
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: 'badge-success',
      sending: 'badge-info',
      draft: 'badge-neutral',
      failed: 'badge-error',
    };
    return map[status] || 'badge-neutral';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Workspace Dashboard</h2>
          <p>Revenue intelligence & autonomous campaign center</p>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => fetchDashboard(true)} 
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="stat-label">{stat.label}</span>
              <stat.icon size={15} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Marketing Intelligence Hub */}
      <MarketingIntelligenceHub />

      {/* AI Insights & Opportunity Discovery Section */}
      <div className="card mb-6" style={{ border: '1px solid var(--border-primary)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
          <Sparkles size={16} style={{ color: 'var(--text-primary)' }} />
          <span className="card-title" style={{ fontWeight: 600 }}>AI Insights & Revenue Opportunities</span>
        </div>
        
        <div className="grid-3" style={{ padding: '16px', gap: '16px' }}>
          {aiInsights.map((insight) => (
            <div key={insight.id} className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: '2px' }}>
                  {insight.confidence_score}% Confidence
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Potential: {formatCurrency(insight.revenue_opportunity)}
                </span>
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{insight.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                {insight.suggested_action}
              </p>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ width: '100%', justifyContent: 'center', padding: '6px', fontSize: '0.75rem', border: '1px solid var(--border-primary)', height: 'auto' }}
                onClick={() => navigate('/copilot', { state: { goalPrompt: insight.suggested_action } })}
              >
                Autopilot Campaign <ArrowUpRight size={13} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          ))}
          {aiInsights.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
              No intelligence insights detected yet.
            </div>
          )}
        </div>
      </div>

      {/* Revenue Forecast & Channel Performance Row */}
      <div className="grid-2 mb-6" style={{ gap: '24px' }}>
        {/* Revenue Forecast Chart */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Revenue Forecast (6mo Hist vs 3mo Forecast)</span>
          </div>
          <div style={{ padding: '16px' }}>
            {revenueForecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueForecast} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-secondary" style={{ color: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-secondary" style={{ color: 'var(--text-secondary)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                    itemStyle={{
                      color: 'var(--text-primary)'
                    }}
                    labelStyle={{
                      color: 'var(--text-secondary)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="historical" fill="var(--chart-historical)" radius={[4, 4, 0, 0]} name="Historical Sales" stackId="a" />
                  <Bar dataKey="forecasted" fill="var(--chart-forecasted)" stroke="var(--chart-forecasted-stroke)" strokeDasharray="3 3" radius={[4, 4, 0, 0]} name="AI Forecasted Growth" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}><p>No forecast telemetry</p></div>
            )}
          </div>
        </div>

        {/* Best Performing Channels */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Best Performing Channels</span>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Revenue</th>
                  <th>CTR</th>
                  <th>Conv. Rate</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {bestChannels.map((bc, i) => (
                  <tr key={bc.channel}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      <span className={`channel-tag ${getChannelClass(bc.channel)}`}>{bc.channel}</span>
                    </td>
                    <td>{formatCurrency(bc.revenue)}</td>
                    <td>{bc.click_rate}%</td>
                    <td>{bc.conversion_rate}%</td>
                    <td style={{ fontWeight: 600 }}>{bc.roi}x</td>
                  </tr>
                ))}
                {bestChannels.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      Waiting for sent campaign telemetry...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Segment Performance & Recent Activities */}
      <div className="grid-2 mb-6" style={{ gap: '24px' }}>
        {/* Segment Performance */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Segment Performance Widget</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/segments')}>Configure</button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Audience</th>
                  <th>Avg Open</th>
                  <th>Avg Conv.</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {segmentPerformance.map(sp => (
                  <tr key={sp.id}>
                    <td style={{ fontWeight: 500 }}>{sp.name}</td>
                    <td>{sp.customer_count}</td>
                    <td>{sp.avg_open_rate}%</td>
                    <td>{sp.avg_conversion_rate}%</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(sp.total_revenue)}</td>
                  </tr>
                ))}
                {segmentPerformance.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      No segments configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ fontWeight: 600 }}>Recent Campaigns & Status</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>History</button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Delivered</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map(camp => (
                  <tr key={camp.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns?id=${camp.id}`)}>
                    <td style={{ fontWeight: 500 }}>{camp.name}</td>
                    <td><span className={`channel-tag ${getChannelClass(camp.channel)}`}>{camp.channel}</span></td>
                    <td><span className={`badge ${getStatusBadge(camp.status)}`}>{camp.status}</span></td>
                    <td>{camp.total_delivered || 0}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(camp.revenue_generated || 0)}</td>
                  </tr>
                ))}
                {recentCampaigns.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      No campaigns launched yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
