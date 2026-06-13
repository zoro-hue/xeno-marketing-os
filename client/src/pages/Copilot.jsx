import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Users, MessageSquare, Send, Target, TrendingUp, Zap, ArrowRight, ShieldAlert, Award, AlertCircle, ShoppingBag, BarChart2, DollarSign, Calendar, Sliders, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import CampaignStrategyWorkspaceModal from '../components/CampaignStrategyWorkspaceModal';
import AutopilotConsole from '../components/AutopilotConsole';

export default function Copilot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // Opportunities discovery
  const [opportunities, setOpportunities] = useState([]);
  const [oppsLoading, setOppsLoading] = useState(false);

  // Strategy modal state
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Launch state
  const [campaignName, setCampaignName] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launchedSuccess, setLaunchedSuccess] = useState(false);


  useEffect(() => {
    fetchOpportunities();
    
    // Auto trigger if passed from dashboard
    if (location.state && location.state.goalPrompt) {
      setGoal(location.state.goalPrompt);
      generateRecommendations(location.state.goalPrompt);
    }
  }, [location.state]);

  const fetchOpportunities = async () => {
    setOppsLoading(true);
    try {
      const res = await api.get('/ai/opportunities');
      setOpportunities(res.data);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setOppsLoading(false);
    }
  };

  const generateRecommendations = async (customGoal) => {
    const goalText = customGoal || goal;
    if (!goalText.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setLaunchedSuccess(false);
    setCampaignName('');

    try {
      const res = await api.post('/ai/campaign-recommendations', { goal: goalText });
      setResult(res.data);
      // Generate a default campaign name based on recommended audience
      const audienceName = res.data.analysis?.audience_name || 'AI Target';
      setCampaignName(`AI Campaign: ${audienceName} (${new Date().toLocaleDateString('en-IN')})`);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      setError('Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const launchAiCampaign = async () => {
    if (!result || !campaignName.trim()) return;
    setLaunching(true);
    try {
      // 1. Create campaign draft
      const draftRes = await api.post('/campaigns', {
        name: campaignName,
        segment_id: result.segment_id, // Matched dynamically in backend
        channel: result.recommended_channel?.channel || 'whatsapp',
        subject: result.suggested_message?.subject || null,
        message_template: result.suggested_message?.message || '',
        confidence_rate: result.analysis?.confidence_score || 85
      });

      // 2. Dispatch campaign instantly
      await api.post(`/campaigns/${draftRes.data.id}/send`);

      setLaunchedSuccess(true);
    } catch (err) {
      console.error('Failed to launch AI campaign:', err);
      setError('Failed to dispatch campaign. Please check segment configuration.');
    } finally {
      setLaunching(false);
    }
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const getChannelClass = (channel) => {
    const map = { email: 'channel-email', whatsapp: 'channel-whatsapp', sms: 'channel-sms', rcs: 'channel-rcs' };
    return map[channel.toLowerCase()] || 'badge-neutral';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Autonomous Campaign Strategy Workspace</h2>
        <p>Analyze performance opportunities, forecast returns, and launch copywriter campaigns instantly</p>
      </div>

      {/* Autopilot Campaign Workflow Console */}
      <div className="mb-6">
        <AutopilotConsole onComplete={(id) => navigate(`/campaigns/${id}`)} />
      </div>

      {/* Opportunity Discovery Hub */}
      <div className="card mb-6" style={{ border: '1px solid var(--border-primary)' }}>
        <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} />
          <span className="card-title" style={{ fontWeight: 600 }}>Opportunity Discovery Hub</span>
        </div>
        <div style={{ padding: '16px' }}>
          {oppsLoading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {opportunities.map((opp) => (
                <div key={opp.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '4px' }}>{opp.badge}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{opp.confidence}% conf.</span>
                    </div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.3 }}>{opp.name}</h4>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <div>Audience: <strong style={{ color: 'var(--text-primary)' }}>{opp.audience_size}</strong></div>
                      <div>Potential: <strong style={{ color: 'var(--success)' }}>{formatCurrency(opp.potential_revenue)}</strong></div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid var(--border-primary)', width: '100%', padding: '4px', fontSize: '0.72rem' }}
                    onClick={() => {
                      setSelectedOpportunity(opp);
                      setModalOpen(true);
                    }}
                  >
                    Analyze
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Strategy Workspace Modal */}
      <CampaignStrategyWorkspaceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        opportunity={selectedOpportunity}
      />

      {/* Goal Input Section */}
      <div className="card mb-6" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Target size={16} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Define Marketing Campaign Objective</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            className="form-input"
            style={{ fontSize: '1rem', padding: '10px 14px' }}
            placeholder="What business outcome would you like to achieve?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateRecommendations()}
            id="copilot-goal-input"
          />
          <button
            className="btn btn-primary"
            onClick={() => generateRecommendations()}
            disabled={loading || !goal.trim()}
            id="copilot-generate-btn"
          >
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Sparkles size={15} /> Strategy Workspace</>}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}>Examples:</span>
          {[
            "Increase repeat purchases",
            "Reduce churn",
            "Boost VIP engagement",
            "Promote new arrivals",
            "Increase average order value"
          ].map((ex, idx) => (
            <button
              key={idx}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              onClick={() => {
                setGoal(ex);
                generateRecommendations(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="card mb-6" style={{ background: 'var(--error-bg)', color: 'var(--error)', borderColor: 'var(--error-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Workspace Animation */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
          <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>AI Architect Assembling Strategy Workspace</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzing cohort metrics, forecasting channels, and drafting templates...</p>
        </div>
      )}

      {/* RESULTS WORKSPACE */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideUp 250ms ease' }}>
          
          {/* Top row: Analysis & Channel Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
            
            {/* AI Analysis & Selected Cohort */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <TrendingUp size={15} />
                  <span className="card-title">AI Strategic Analysis</span>
                </div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '16px' }}>{result.analysis?.summary}</p>
                
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cohort Selection: {result.analysis?.audience_name}</span>
                    <span className="badge badge-neutral"><Users size={11} style={{ marginRight: '3px' }} /> {result.analysis?.audience_size} customers</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Selection Rule Rationale:</strong> {result.analysis?.reasoning}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-secondary)', paddingTop: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Revenue Opportunity</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(result.analysis?.revenue_opportunity)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>AI Confidence</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{result.analysis?.confidence_score}%</div>
                </div>
              </div>
            </div>

            {/* Recommended Channel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Send size={15} />
                  <span className="card-title">Channel Strategy</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Recommended Channel</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span className={`channel-tag ${getChannelClass(result.recommended_channel?.channel || '')}`} style={{ fontSize: '0.95rem', padding: '4px 10px' }}>
                      {result.recommended_channel?.channel}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{result.recommended_channel?.confidence_score}% Channel Fit</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {result.recommended_channel?.reasoning}
                </p>
              </div>
            </div>

          </div>

          {/* Campaign Performance Prediction KPI row */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              <BarChart2 size={15} />
              <span className="card-title">Campaign Performance Predictions</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected Delivery</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.predictions?.expected_delivery_rate}%</div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected Open</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.predictions?.expected_open_rate}%</div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected CTR</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.predictions?.expected_click_rate}%</div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected Conversion</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.predictions?.expected_conversion_rate}%</div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected Revenue</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>{formatCurrency(result.predictions?.expected_revenue)}</div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected ROI</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.predictions?.expected_roi}x</div>
              </div>
            </div>
          </div>

          {/* Copywriting & Campaign Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            
            {/* Suggested Message copy */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <MessageSquare size={15} />
                <span className="card-title">AI Generated Copywriter Output</span>
              </div>
              {result.suggested_message?.subject && (
                <div style={{ marginBottom: '10px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Subject Line:</span> <strong style={{ color: 'var(--text-primary)' }}>{result.suggested_message.subject}</strong>
                </div>
              )}
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', lineHeight: 1.7, fontSize: '0.92rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {result.suggested_message?.message}
              </div>
            </div>

            {/* Strategy Parameters */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Sliders size={15} />
                  <span className="card-title">Strategy Specs</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Recommended Offer</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{result.strategy?.offer}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Copy Tone</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{result.strategy?.tone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Dispatch Timing</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{result.strategy?.timing}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}><Calendar size={12} /> <span>Timing Reason:</span></div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>{result.strategy?.explain_timing}</p>
              </div>
            </div>

          </div>

          {/* Launch Control Panel */}
          <div className="card" style={{ border: '1px solid var(--success-border)', background: 'var(--success-bg)' }}>
            {launchedSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Campaign Successfully Dispatched</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>All queue processes completed. Check logs under Campaigns.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/campaigns')} style={{ marginTop: '8px' }}>View Campaign Status</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontWeight: 700 }}>Launch Campaign Instantly</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Review values above. The segment and channel are automatically resolved for dispatch.</p>
                  <input
                    className="form-input"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)', marginTop: '10px', maxWidth: '380px' }}
                    placeholder="Enter campaign name..."
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ background: 'var(--success)', color: 'var(--bg-primary)', padding: '12px 24px' }}
                  onClick={launchAiCampaign}
                  disabled={launching || !campaignName.trim()}
                >
                  {launching ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={15} /> Dispatch Campaign</>}
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
          <Sparkles size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '16px', opacity: 0.4 }} />
          <h3>AI Copilot Idle</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', margin: '4px auto 0' }}>Define a marketing goal or click on one of the auto-discovered opportunities above to generate a strategy workspace.</p>
        </div>
      )}
    </div>
  );
}
