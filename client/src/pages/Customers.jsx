import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, ShoppingBag, ShieldAlert, Award, UserCheck, RefreshCw, MessageSquare, IndianRupee, Activity, HelpCircle, Sparkles } from 'lucide-react';
import api from '../lib/api';

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState([]);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  
  // Detailed customer info
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { page, limit: pagination.limit, search, city: cityFilter, sort, order }
      });
      setCustomers(res.data.customers);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, sort, order, pagination.limit]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCustomers(1);
  }, [search, cityFilter, sort, order]);

  useEffect(() => {
    api.get('/customers/meta/cities')
      .then(res => setCities(res.data))
      .catch(console.error);
  }, []);

  const viewCustomerDetail = async (id) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setDetailData(res.data);
    } catch (err) {
      console.error('Failed to fetch customer detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSort = (field) => {
    if (sort === field) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Loyal':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Award size={12} /> Loyal</span>;
      case 'Active':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><UserCheck size={12} /> Active</span>;
      case 'At Risk':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={12} /> At Risk</span>;
      case 'Churn Risk':
        return <span className="badge badge-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={12} /> Churn Risk</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  };

  const getChannelBadgeClass = (channel) => {
    const map = { email: 'channel-email', whatsapp: 'channel-whatsapp', sms: 'channel-sms', rcs: 'channel-rcs' };
    return map[channel.toLowerCase()] || 'badge-neutral';
  };

  const SortIndicator = ({ field }) => {
    if (sort !== field) return null;
    return <span style={{ marginLeft: 4 }}>{order === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Customers Database</h2>
          <p>Customer Intelligence & Retention Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchCustomers(pagination.page)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Sync Database
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, LTV..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchParams(e.target.value ? { search: e.target.value } : {});
            }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        >
          <option value="">All cities</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Main Customers Layout (Table + Optional Details Side-by-Side) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Table Container */}
        <div className="table-container" style={{ flex: 1, minWidth: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  Customer <SortIndicator field="name" />
                </th>
                <th>Status</th>
                <th>Health Score</th>
                <th>Churn Risk</th>
                <th>Engagement</th>
                <th>Preferred</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total_spend')}>
                  LTV <SortIndicator field="total_spend" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('last_purchase')}>
                  Last Purchase <SortIndicator field="last_purchase" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8"><div className="loading-spinner"><div className="spinner" /></div></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 32 }}>No customers found</td></tr>
              ) : (
                customers.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => viewCustomerDetail(c.id)} 
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedCustomerId === c.id ? 'var(--bg-active)' : ''
                    }}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.email} · {c.city || '—'}</div>
                      </div>
                    </td>
                    <td>{getStatusBadge(c.status_badge)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getHealthColor(c.health_score) }} />
                        <span style={{ fontWeight: 600 }}>{c.health_score}/100</span>
                      </div>
                    </td>
                    <td style={{ color: c.churn_risk > 70 ? 'var(--error)' : 'inherit' }}>{c.churn_risk}%</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '60px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.engagement_score}%</span>
                        <div style={{ width: '100%', height: '3px', background: 'var(--border-primary)', borderRadius: '1px', marginTop: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${c.engagement_score}%`, height: '100%', background: '#000000' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`channel-tag channel-${c.preferred_channel?.toLowerCase()}`}>
                        {c.preferred_channel}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.lifetime_value)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(c.last_purchase)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} customers
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side intelligence panel */}
        {selectedCustomerId && (
          <div className="card" style={{ width: '420px', flexShrink: 0, border: '1px solid #171717', position: 'sticky', top: '80px', animation: 'slideUp 180ms ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Intelligence</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCustomerId(null)} style={{ padding: '4px' }}>✕</button>
            </div>

            {detailLoading ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : detailData ? (
              <div>
                {/* Profile header */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{detailData.customer.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{detailData.customer.email} · {detailData.customer.phone || 'No phone'}</div>
                </div>

                {/* Enriched AI Score Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Health Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: getHealthColor(detailData.customer.health_score) }}>{detailData.customer.health_score}/100</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Engagement Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{detailData.customer.engagement_score}%</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Churn Risk</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: detailData.customer.churn_risk > 70 ? 'var(--error)' : 'inherit' }}>{detailData.customer.churn_risk}%</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Preferred Channel</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{detailData.customer.preferred_channel}</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Loyalty Tier</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>{detailData.customer.loyalty_tier || 'Silver'}</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Revenue Contribution</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{detailData.customer.revenue_contribution || 'Medium'}</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Next Purchase Probability</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{detailData.customer.next_purchase_prob || 80}%</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Predicted Future Spend</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{(detailData.customer.predicted_future_spend || 2500).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* AI Predictive Intelligence Section */}
                <div style={{ border: '1px solid var(--border-primary)', borderRadius: '4px', padding: '12px', marginBottom: '16px', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#ec4899' }} /> AI Predictive Intelligence
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Predicted LTV:</strong> <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{(detailData.customer.predicted_ltv || 15000).toLocaleString('en-IN')}</span> (estimated 12-month future valuation)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                    <strong>Behavioral Profile:</strong> {detailData.customer.behavioral_summary}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                    <strong>AI Sentiment Insight:</strong> {detailData.customer.ai_insights}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Next Best Action:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{detailData.customer.recommended_action}</span>
                  </div>
                </div>

                {/* Summary Statistics */}
                <div style={{ border: '1px solid var(--border-primary)', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid var(--border-secondary)', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> Campaign Engagement History
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sent</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{detailData.stats.total_communications}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Opened</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{detailData.stats.opened}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Clicked</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{detailData.stats.clicked}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Conv.</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--success)' }}>{detailData.stats.converted}</div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={14} /> Order History ({detailData.customer.order_count})
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: '4px' }}>
                    <table className="table" style={{ fontSize: '0.78rem' }}>
                      <tbody>
                        {detailData.orders.map(order => (
                          <tr key={order.id}>
                            <td style={{ fontWeight: 600 }}>{order.product}</td>
                            <td>{formatCurrency(order.amount)}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{formatDate(order.created_at)}</td>
                          </tr>
                        ))}
                        {detailData.orders.length === 0 && (
                          <tr><td style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No orders yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Campaign interactions */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} /> Direct Communications
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: '4px' }}>
                    <table className="table" style={{ fontSize: '0.78rem' }}>
                      <tbody>
                        {detailData.campaigns.map(comm => (
                          <tr key={comm.communication_id}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 600 }}>{comm.campaign_name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'normal', lineClamp: 2 }}>{comm.message}</div>
                              </div>
                            </td>
                            <td>
                              <span className={`channel-tag ${getChannelBadgeClass(comm.channel)}`} style={{ fontSize: '0.65rem' }}>{comm.channel}</span>
                            </td>
                            <td>
                              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{comm.status}</span>
                            </td>
                          </tr>
                        ))}
                        {detailData.campaigns.length === 0 && (
                          <tr><td style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No communications logged</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>Failed to load detail telemetry.</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
