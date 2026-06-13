import { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Sparkles, Eye, X, Activity, TrendingUp, IndianRupee, ShoppingBag, Mail, CheckSquare } from 'lucide-react';
import api from '../lib/api';

const FIELD_OPTIONS = [
  { value: 'total_spend', label: 'Total Spend (₹)' },
  { value: 'order_count', label: 'Order Count' },
  { value: 'last_purchase', label: 'Last Purchase' },
  { value: 'city', label: 'City' },
  { value: 'created_at', label: 'Customer Since' },
];

const OPERATOR_OPTIONS = {
  total_spend: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
  ],
  order_count: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than_or_equal', label: 'At least' },
  ],
  last_purchase: [
    { value: 'older_than_days', label: 'Older than (days ago)' },
    { value: 'newer_than_days', label: 'Within last (days)' },
  ],
  city: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
  ],
  created_at: [
    { value: 'older_than_days', label: 'Older than (days ago)' },
    { value: 'newer_than_days', label: 'Within last (days)' },
  ],
};

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailCustomers, setDetailCustomers] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', rules: [{ field: 'total_spend', operator: 'greater_than', value: '' }] });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const res = await api.get('/segments');
      setSegments(res.data);
    } catch (err) {
      console.error('Failed to fetch segments:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewSegment = async (id) => {
    try {
      const res = await api.get(`/segments/${id}`);
      setShowDetail(res.data.segment);
      setDetailCustomers(res.data.customers);
    } catch (err) {
      console.error('Failed to fetch segment:', err);
    }
  };

  const deleteSegment = async (id) => {
    if (!confirm('Delete this segment?')) return;
    try {
      await api.delete(`/segments/${id}`);
      setSegments(prev => prev.filter(s => s.id !== id));
      if (showDetail?.id === id) setShowDetail(null);
    } catch (err) {
      console.error('Failed to delete segment:', err);
    }
  };

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, { field: 'total_spend', operator: 'greater_than', value: '' }]
    }));
  };

  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const updateRule = (index, key, value) => {
    setFormData(prev => {
      const rules = [...prev.rules];
      rules[index] = { ...rules[index], [key]: value };
      if (key === 'field') {
        const ops = OPERATOR_OPTIONS[value];
        rules[index].operator = ops?.[0]?.value || 'equals';
        rules[index].value = '';
      }
      return { ...prev, rules };
    });
  };

  const previewSegment = async () => {
    setPreviewLoading(true);
    try {
      const validRules = formData.rules.filter(r => r.value !== '');
      const res = await api.post('/segments/preview', { rules: validRules });
      setPreview(res.data);
    } catch (err) {
      console.error('Failed to preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveSegment = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const validRules = formData.rules.filter(r => r.value !== '');
      await api.post('/segments', {
        name: formData.name,
        description: formData.description,
        rules: validRules,
      });
      setShowModal(false);
      setFormData({ name: '', description: '', rules: [{ field: 'total_spend', operator: 'greater_than', value: '' }] });
      setPreview(null);
      fetchSegments();
    } catch (err) {
      console.error('Failed to create segment:', err);
    } finally {
      setSaving(false);
    }
  };

  const aiSuggestSegment = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post('/ai/suggest-segment', { description: aiPrompt });
      setFormData({
        name: res.data.name || '',
        description: res.data.description || '',
        rules: res.data.rules || [{ field: 'total_spend', operator: 'greater_than', value: '' }],
      });
      setAiPrompt('');
      const validRules = (res.data.rules || []).filter(r => r.value !== '');
      if (validRules.length > 0) {
        const previewRes = await api.post('/segments/preview', { rules: validRules });
        setPreview(previewRes.data);
      }
    } catch (err) {
      console.error('Failed to get AI suggestion:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Segments</h2>
            <p>Targeted audience segmentation & predictive performance intelligence</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="create-segment-btn">
            <Plus size={16} /> Create Segment
          </button>
        </div>
      </div>

      {/* Segment Detail Panel */}
      {showDetail && (
        <div className="card mb-6" style={{ animation: 'slideUp 200ms ease', border: '1px solid #171717' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>{showDetail.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{showDetail.description}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(null)}>✕</button>
          </div>

          {/* Segment Analytics Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Audience Size</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Users size={14} /> {showDetail.customer_count}</div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Spend</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}><IndianRupee size={13} /> {formatCurrency(showDetail.average_spend)}</div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Orders</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><ShoppingBag size={14} /> {showDetail.average_orders}</div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Revenue Potential</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px', color: 'var(--success)' }}><TrendingUp size={14} /> {formatCurrency(showDetail.revenue_potential)}</div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Predicted Open</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Mail size={14} /> {showDetail.predicted_open_rate}%</div>
            </div>
            <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Predicted Conv.</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><CheckSquare size={14} /> {showDetail.predicted_conversion_rate}%</div>
            </div>
          </div>

          {detailCustomers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Sample</div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>City</th>
                      <th>Spend (LTV)</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailCustomers.slice(0, 10).map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                        <td>{c.city}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(c.total_spend)}</td>
                        <td>{c.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detailCustomers.length > 10 && (
                  <div style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-secondary)' }}>
                    +{detailCustomers.length - 10} more customers in this segment
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Segments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {segments.map(seg => (
          <div key={seg.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }} onClick={() => viewSegment(seg.id)}>{seg.name}</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" onClick={() => viewSegment(seg.id)} title="View"><Eye size={14} /></button>
                  <button className="icon-btn" onClick={() => deleteSegment(seg.id)} title="Delete" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, minHeight: '36px', lineHeight: 1.4 }}>
                {seg.description || 'No description'}
              </p>
            </div>

            {/* Predictive Intelligence Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', borderTop: '1px solid var(--border-secondary)', paddingTop: '12px', fontSize: '0.78rem' }}>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Audience</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>{seg.customer_count}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Avg spend</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>{formatCurrency(seg.average_spend)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase' }}>Revenue Pot.</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)', marginTop: '2px' }}>{formatCurrency(seg.revenue_potential)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', marginTop: '4px' }}>Avg orders</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{seg.average_orders}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', marginTop: '4px' }}>Pred. Open</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{seg.predicted_open_rate}%</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', textTransform: 'uppercase', marginTop: '4px' }}>Pred. Conv.</div>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{seg.predicted_conversion_rate}%</div>
              </div>
            </div>
          </div>
        ))}

        {segments.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <Users size={48} />
            <h3>No segments yet</h3>
            <p>Create your first audience segment to target specific customer groups.</p>
          </div>
        )}
      </div>

      {/* Create Segment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Segment Workspace</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* AI Assist */}
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={14} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>AI Natural Language Segment Generator</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="e.g., 'customers with spend > 12000 who purchased at least 6 times'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aiSuggestSegment()}
                  />
                  <button className="btn btn-primary" onClick={aiSuggestSegment} disabled={aiLoading || !aiPrompt.trim()}>
                    {aiLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Generate Rules'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Segment Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. High Value Customers"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Brief description of this segment"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Rules */}
              <div className="form-group">
                <label className="form-label">Segment Selection Rules</label>
                {formData.rules.map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={rule.field}
                      onChange={(e) => updateRule(idx, 'field', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {FIELD_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      className="form-select"
                      value={rule.operator}
                      onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {(OPERATOR_OPTIONS[rule.field] || []).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(idx, 'value', e.target.value)}
                      style={{ flex: 0.7 }}
                    />
                    {formData.rules.length > 1 && (
                      <button className="icon-btn" onClick={() => removeRule(idx)} style={{ color: 'var(--error)', flexShrink: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addRule}>
                  <Plus size={14} /> Add Rule
                </button>
              </div>

              {/* Preview */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-secondary" onClick={previewSegment} disabled={previewLoading}>
                  {previewLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Eye size={14} /> Preview Matches</>}
                </button>
              </div>

              {preview && (
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {preview.count} customers currently matching rules
                  </div>
                  {preview.sample.length > 0 && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Sample: {preview.sample.map(s => s.name).join(', ')}
                      {preview.count > 5 && ` and ${preview.count - 5} more`}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={saveSegment}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Create Segment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
