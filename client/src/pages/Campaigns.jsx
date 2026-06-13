import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Send, Sparkles, Check, ChevronRight, X, Eye, Mail, MessageSquare, Smartphone, Radio, AlertCircle, RefreshCw, BarChart2, IndianRupee, Award, Percent, Trash2 } from 'lucide-react';
import api from '../lib/api';
import socket from '../lib/socket';

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail, description: 'Rich HTML content with subject line' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Casual, direct messaging' },
  { value: 'sms', label: 'SMS', icon: Smartphone, description: 'Short, urgent messages (160 chars)' },
  { value: 'rcs', label: 'RCS', icon: Radio, description: 'Rich messaging with media support' },
];

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdFromQuery = searchParams.get('id');

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [step, setStep] = useState(1);
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewCampaign, setViewCampaign] = useState(null);
  const [viewComms, setViewComms] = useState([]);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customGoal, setCustomGoal] = useState('');
  const [customRecommendation, setCustomRecommendation] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [aiChannelRec, setAiChannelRec] = useState(null);
  const [aiChannelLoading, setAiChannelLoading] = useState(false);

  const fetchChannelRecommendation = async (segment) => {
    if (!segment) return;
    setAiChannelLoading(true);
    setAiChannelRec(null);
    try {
      const res = await api.post('/ai/suggest-channel', {
        segment_name: segment.name,
        segment_description: segment.description
      });
      setAiChannelRec(res.data);
      setSelectedChannel(res.data.channel);
    } catch (err) {
      console.error('Failed to fetch channel recommendation:', err);
    } finally {
      setAiChannelLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (campaignIdFromQuery) {
      viewCampaignDetail(campaignIdFromQuery);
    }
  }, [campaignIdFromQuery]);

  useEffect(() => {
    if (!viewCampaign) return;
    const interval = setInterval(() => {
      viewCampaignDetail(viewCampaign.id);
    }, 2500);
    return () => clearInterval(interval);
  }, [viewCampaign?.id]);

  useEffect(() => {
    const handleCampaignUpdate = (data) => {
      console.log('Real-time campaign update received:', data);
      fetchCampaigns();
      if (viewCampaign && viewCampaign.id === data.campaignId) {
        viewCampaignDetail(data.campaignId);
      }
    };

    socket.on('campaign_update', handleCampaignUpdate);
    return () => {
      socket.off('campaign_update', handleCampaignUpdate);
    };
  }, [viewCampaign?.id]);

  const fetchCampaigns = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      if (isManual) setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchSegments = async () => {
    try {
      const res = await api.get('/segments');
      setSegments(res.data);
    } catch (err) {
      console.error('Failed to fetch segments:', err);
    }
  };

  const startCreation = () => {
    setShowCreator(true);
    setShowCustomCreator(false);
    setStep(1);
    setSelectedSegment(null);
    setSelectedChannel('');
    setCampaignName('');
    setSubject('');
    setMessage('');
    setCampaignGoal('');
    setAiChannelRec(null);
    fetchSegments();
  };

  const startCustomCreation = () => {
    setShowCustomCreator(true);
    setShowCreator(false);
    setCustomGoal('');
    setCustomRecommendation(null);
    setCampaignName('');
    setSelectedSegment(null);
    setSelectedChannel('');
    setSubject('');
    setMessage('');
    fetchSegments();
  };

  const launchCustomCampaign = async () => {
    if (!campaignName || !selectedSegment || !selectedChannel || !message) return;
    setSending(true);
    try {
      const createRes = await api.post('/campaigns', {
        name: campaignName,
        segment_id: selectedSegment.id,
        channel: selectedChannel,
        subject: subject || null,
        message_template: message,
        confidence_rate: customRecommendation?.analysis?.confidence_score || 85
      });

      await api.post(`/campaigns/${createRes.data.id}/send`);

      setShowCustomCreator(false);
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to launch custom campaign:', err);
    } finally {
      setSending(false);
    }
  };

  const generateMessage = async () => {
    if (!campaignGoal.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post('/ai/generate-message', {
        channel: selectedChannel,
        segment_name: selectedSegment?.name,
        segment_description: selectedSegment?.description,
        campaign_goal: campaignGoal,
      });
      setSubject(res.data.subject || '');
      setMessage(res.data.message || '');
    } catch (err) {
      console.error('Failed to generate message:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const launchCampaign = async () => {
    if (!campaignName || !selectedSegment || !selectedChannel || !message) return;
    setSending(true);
    try {
      const createRes = await api.post('/campaigns', {
        name: campaignName,
        segment_id: selectedSegment.id,
        channel: selectedChannel,
        subject: subject || null,
        message_template: message,
        confidence_rate: Math.floor(Math.random() * (96 - 80 + 1)) + 80
      });

      await api.post(`/campaigns/${createRes.data.id}/send`);

      setShowCreator(false);
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to launch campaign:', err);
    } finally {
      setSending(false);
    }
  };

  const viewCampaignDetail = (id) => {
    navigate(`/campaigns/${id}`);
  };

  const getChannelClass = (channel) => {
    const map = { email: 'channel-email', whatsapp: 'channel-whatsapp', sms: 'channel-sms', rcs: 'channel-rcs' };
    return map[channel] || 'badge-neutral';
  };

  const getStatusBadge = (status) => {
    const map = { completed: 'badge-success', sending: 'badge-info', draft: 'badge-neutral', failed: 'badge-error' };
    return map[status] || 'badge-neutral';
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const getCommStatusBadge = (status) => {
    const map = {
      delivered: 'badge-success', opened: 'badge-info', read: 'badge-info',
      clicked: 'badge-success', converted: 'badge-success', failed: 'badge-error', sent: 'badge-neutral', queued: 'badge-neutral'
    };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  // Custom Campaign Creator
  if (showCustomCreator) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Custom Campaign (AI-Assisted)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Define a custom goal and generate strategic campaign settings using AI.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowCustomCreator(false)}>Cancel</button>
        </div>

        <div className="grid-2">
          {/* Goal Input Section */}
          <div className="card" style={{ border: '1px solid var(--border-primary)', padding: '16px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>1. Describe Campaign Goal</h3>
            <div className="form-group">
              <label className="form-label">What outcome do you want to achieve?</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Increase repeat purchases for customers in Delhi with a 20% discount"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                rows={3}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Example Goals:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  "Increase repeat purchases",
                  "Promote new winter collection",
                  "Recover inactive users",
                  "Upsell premium products",
                  "Launch flash sale"
                ].map((eg, idx) => (
                  <button
                    key={idx}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'var(--bg-secondary)' }}
                    onClick={() => setCustomGoal(eg)}
                  >
                    {eg}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              disabled={customLoading || !customGoal.trim()}
              onClick={async () => {
                setCustomLoading(true);
                try {
                  const res = await api.post('/ai/campaign-recommendations', { goal: customGoal });
                  setCustomRecommendation(res.data);
                  
                  // Prepopulate state fields from AI recommendations
                  setCampaignName(`Custom: ${customGoal}`);
                  setSelectedChannel(res.data.recommended_channel.channel);
                  setSubject(res.data.suggested_message.subject || '');
                  setMessage(res.data.suggested_message.message || '');
                  
                  // Match segment
                  if (res.data.segment_id) {
                    const seg = segments.find(s => s.id === res.data.segment_id);
                    setSelectedSegment(seg);
                  } else if (segments.length > 0) {
                    setSelectedSegment(segments[0]);
                  }
                } catch (err) {
                  console.error('Failed to get recommendations:', err);
                } finally {
                  setCustomLoading(false);
                }
              }}
            >
              {customLoading ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <><Sparkles size={16} /> Generate Campaign Strategy</>
              )}
            </button>
          </div>

          {/* AI generated review / launch section */}
          <div className="card" style={{ border: '1px solid var(--border-primary)', padding: '16px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>2. Review & Launch Campaign</h3>
            {!customRecommendation ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-tertiary)' }}>
                <Sparkles size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: '0.88rem' }}>Enter a goal on the left to generate settings.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '6px', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> AI Strategy Insight
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {customRecommendation.analysis.summary}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <div>Forecast: <span style={{ color: 'var(--success)' }}>₹{customRecommendation.analysis.revenue_opportunity.toLocaleString()}</span></div>
                    <div>Confidence: {customRecommendation.analysis.confidence_score}%</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Campaign Name</label>
                  <input
                    className="form-input"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Audience Segment</label>
                  <select 
                    className="form-input"
                    value={selectedSegment?.id || ''}
                    onChange={(e) => {
                      const seg = segments.find(s => s.id === parseInt(e.target.value));
                      setSelectedSegment(seg);
                    }}
                  >
                    <option value="">Select Segment</option>
                    {segments.map(seg => (
                      <option key={seg.id} value={seg.id}>{seg.name} ({seg.customer_count} customers)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <select
                    className="form-input"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="rcs">RCS</option>
                  </select>
                </div>

                {selectedChannel === 'email' && (
                  <div className="form-group">
                    <label className="form-label">Subject Line</label>
                    <input
                      className="form-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Message Template</label>
                  <textarea
                    className="form-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '8px' }}
                  disabled={sending || !campaignName || !selectedSegment || !selectedChannel || !message}
                  onClick={launchCustomCampaign}
                >
                  {sending ? (
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <><Send size={16} /> Launch Custom Campaign</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Campaign Creator
  if (showCreator) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>New Campaign</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Create and launch a targeted campaign</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowCreator(false)}>Cancel</button>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {['Choose Audience', 'Choose Channel', 'Craft Message', 'Launch'].map((label, i) => (
            <div key={i} className={`step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}>
              <div className="step-number">
                {step > i + 1 ? <Check size={14} /> : i + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Choose Audience */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {segments.map(seg => (
                <div
                  key={seg.id}
                  className="card"
                  onClick={() => setSelectedSegment(seg)}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedSegment?.id === seg.id ? 'var(--accent)' : undefined,
                    borderWidth: selectedSegment?.id === seg.id ? 2 : 1,
                  }}
                >
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{seg.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{seg.description}</p>
                  <span className="badge badge-neutral">{seg.customer_count} customers</span>
                </div>
              ))}
            </div>
            {segments.length === 0 && (
              <div className="empty-state">
                <p>No segments available. Create one first.</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                className="btn btn-primary"
                disabled={!selectedSegment}
                onClick={() => {
                  fetchChannelRecommendation(selectedSegment);
                  setStep(2);
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Channel */}
        {step === 2 && (
          <div>
            {aiChannelLoading ? (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-primary)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--text-secondary)'
              }}>
                <RefreshCw size={16} style={{ color: '#6366f1', animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: '0.88rem' }}>AI is analyzing segment characteristics to suggest the optimal channel...</span>
              </div>
            ) : aiChannelRec ? (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '14px 18px',
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Sparkles style={{ color: '#6366f1', marginTop: '2px', flexShrink: 0 }} size={18} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    AI Channel Suggestion: <span style={{ textTransform: 'capitalize', color: '#6366f1', fontWeight: 700 }}>{aiChannelRec.channel}</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {aiChannelRec.confidence_score}% Fit
                    </span>
                  </h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.45 }}>
                    {aiChannelRec.reasoning}
                  </p>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {CHANNELS.map(ch => (
                <div
                  key={ch.value}
                  className="card"
                  onClick={() => setSelectedChannel(ch.value)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    borderColor: selectedChannel === ch.value ? 'var(--accent)' : undefined,
                    borderWidth: selectedChannel === ch.value ? 2 : 1,
                  }}
                >
                  {aiChannelRec?.channel === ch.value && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      background: '#6366f1',
                      color: '#ffffff',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <Sparkles size={8} /> SUGGESTED
                    </span>
                  )}
                  <ch.icon size={20} style={{ marginBottom: 8 }} />
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{ch.label}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ch.description}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" disabled={!selectedChannel} onClick={() => setStep(3)}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Craft Message */}
        {step === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input
                className="form-input"
                placeholder="e.g. Summer Sale 2024"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* AI Message Generator */}
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>AI Message Generator</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Describe your campaign goal, e.g. 'Drive repeat purchases with a 20% discount'"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateMessage()}
                />
                <button className="btn btn-primary" onClick={generateMessage} disabled={aiLoading || !campaignGoal.trim()}>
                  {aiLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Generate'}
                </button>
              </div>
            </div>

            {selectedChannel === 'email' && (
              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  className="form-input"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                placeholder="Write your message here. Use {{name}} for personalization."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                Use {'{{name}}'} to personalize with customer name
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" disabled={!message.trim() || !campaignName.trim()} onClick={() => setStep(4)}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Launch */}
        {step === 4 && (
          <div>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Campaign Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div className="stat-label">Campaign Name</div>
                  <div style={{ fontWeight: 500 }}>{campaignName}</div>
                </div>
                <div>
                  <div className="stat-label">Audience</div>
                  <div style={{ fontWeight: 500 }}>{selectedSegment?.name} ({selectedSegment?.customer_count} customers)</div>
                </div>
                <div>
                  <div className="stat-label">Channel</div>
                  <div><span className={`channel-tag ${getChannelClass(selectedChannel)}`}>{selectedChannel}</span></div>
                </div>
                {subject && (
                  <div>
                    <div className="stat-label">Subject</div>
                    <div style={{ fontWeight: 500 }}>{subject}</div>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="stat-label">Message Preview</div>
                  <div style={{
                    padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                    marginTop: 6, fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {message}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" onClick={launchCampaign} disabled={sending}>
                {sending ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Send size={16} /> Launch Campaign</>}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper values for funnel calculation
  const getFunnelRates = (c) => {
    const sent = c.total_sent || 1;
    const delivered = c.total_delivered || 0;
    const opened = c.total_opened || 0;
    const clicked = c.total_clicked || 0;
    const converted = c.total_converted || 0;

    return {
      deliveryRate: Math.round((delivered / sent) * 100),
      openRate: Math.round((opened / (delivered || 1)) * 100),
      clickRate: Math.round((clicked / (opened || 1)) * 100),
      conversionRate: Math.round((converted / (clicked || 1)) * 100),
      overallConv: Math.round((converted / sent) * 100)
    };
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Campaign Workspace</h2>
            <p>High-density campaign operations & conversion funnel analytics</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => fetchCampaigns(true)} 
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync Telemetry'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={startCustomCreation} id="custom-campaign-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: '#6366f1' }} /> Custom Campaign
            </button>
            <button className="btn btn-primary" onClick={startCreation} id="create-campaign-btn">
              <Plus size={16} /> New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Details Panel */}
      {viewCampaign && (() => {
        const rates = getFunnelRates(viewCampaign);
        const estCost = viewCampaign.total_sent * 1.5;
        const roi = viewCampaign.revenue_generated > 0 ? (viewCampaign.revenue_generated / estCost).toFixed(1) : '0.0';

        return (
          <div className="card mb-6 animate-slide-up" style={{ border: '1px solid var(--border-primary)', animation: 'slideUp 200ms ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{viewCampaign.name}</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span className={`channel-tag ${getChannelClass(viewCampaign.channel)}`}>{viewCampaign.channel}</span>
                  <span className={`badge ${getStatusBadge(viewCampaign.status)}`}>{viewCampaign.status}</span>
                  {viewCampaign.confidence_rate && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Sparkles size={12} style={{ color: '#6366f1' }} /> {viewCampaign.confidence_rate}% Confidence
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Created {formatDate(viewCampaign.created_at)}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setViewCampaign(null); setSearchParams({}); }} style={{ padding: '4px' }}>✕</button>
            </div>

            {/* Campaign Performance Highlight Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Revenue</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <IndianRupee size={16} /> {parseFloat(viewCampaign.revenue_generated || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>ROI MULTIPLIER</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Award size={16} /> {roi}x
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>DELIVERY RATE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Percent size={14} /> {rates.deliveryRate}%
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>CTR (CLICK-THROUGH)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Percent size={14} /> {rates.clickRate}%
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>CONVERSION RATE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Percent size={14} /> {rates.conversionRate}%
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>CONFIDENCE RATE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Sparkles size={14} style={{ color: '#6366f1' }} /> {viewCampaign.confidence_rate || 85}%
                </div>
              </div>
            </div>

            {/* Conversion Funnel Visualization */}
            <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={14} /> Performance Conversion Funnel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Sent */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600 }}>1. Sent to Gateway</span>
                    <span>{viewCampaign.total_sent} users (100%)</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: 'var(--border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                </div>
                {/* Delivered */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600 }}>2. Delivered to Device</span>
                    <span>{viewCampaign.total_delivered} users ({rates.deliveryRate}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: 'var(--border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${rates.deliveryRate}%`, height: '100%', background: 'var(--text-secondary)', borderRadius: '8px' }} />
                  </div>
                </div>
                {/* Opened */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600 }}>3. Opened & Read</span>
                    <span>{viewCampaign.total_opened} users ({rates.openRate}% of delivered)</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: 'var(--border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((viewCampaign.total_opened / (viewCampaign.total_sent || 1)) * 100)}%`, height: '100%', background: 'var(--border-focus)', borderRadius: '8px' }} />
                  </div>
                </div>
                {/* Clicked */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600 }}>4. Clicked Call-to-Action</span>
                    <span>{viewCampaign.total_clicked} users ({rates.clickRate}% of opened)</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: 'var(--border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((viewCampaign.total_clicked / (viewCampaign.total_sent || 1)) * 100)}%`, height: '100%', background: '#6366f1', borderRadius: '8px' }} />
                  </div>
                </div>
                {/* Converted */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>5. Converted & Paid</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{viewCampaign.total_converted} sales ({rates.conversionRate}% of clicked)</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: 'var(--border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((viewCampaign.total_converted / (viewCampaign.total_sent || 1)) * 100)}%`, height: '100%', background: 'var(--success)', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Details Table */}
            {viewComms.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Real-time Delivery Logs</div>
                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Delivered</th>
                        <th>Opened</th>
                        <th>Conversion Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewComms.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.customer_email}</div>
                          </td>
                          <td><span className={`badge ${getCommStatusBadge(c.status)}`}>{c.status}</span></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.sent_at ? formatDate(c.sent_at) : '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.delivered_at ? formatDate(c.delivered_at) : '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.opened_at ? formatDate(c.opened_at) : '—'}</td>
                          <td style={{ fontWeight: 600, color: c.conversion_revenue ? 'var(--success)' : 'inherit' }}>
                            {c.conversion_revenue ? formatCurrency(c.conversion_revenue) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Campaigns Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Audience</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Delivered</th>
              <th>Opened</th>
              <th>Clicked</th>
              <th>Converted</th>
              <th>Revenue</th>
              <th>ROI</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(camp => {
              const rates = getFunnelRates(camp);
              const estCost = camp.total_sent * 1.5;
              const roi = camp.revenue_generated > 0 ? `${(camp.revenue_generated / estCost).toFixed(1)}x` : '0.0x';

              return (
                <tr key={camp.id}>
                  <td>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontWeight: 600 }}>{camp.name}</div>
                        {camp.confidence_rate && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 5px', background: 'var(--bg-secondary, #fafafa)', border: '1px solid var(--border-secondary, #eaeaea)', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--text-secondary, #737373)' }}>
                            <Sparkles size={8} style={{ color: '#6366f1' }} /> {camp.confidence_rate}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {camp.message_template}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{camp.segment_name || '—'}</td>
                  <td><span className={`channel-tag ${getChannelClass(camp.channel)}`}>{camp.channel}</span></td>
                  <td><span className={`badge ${getStatusBadge(camp.status)}`}>{camp.status}</span></td>
                  <td>{camp.total_sent}</td>
                  <td>{camp.total_delivered} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({rates.deliveryRate}%)</span></td>
                  <td>{camp.total_opened} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({rates.openRate}%)</span></td>
                  <td>{camp.total_clicked} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({rates.clickRate}%)</span></td>
                  <td>{camp.total_converted} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({rates.conversionRate}%)</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(camp.revenue_generated)}</td>
                  <td style={{ fontWeight: 600 }}>{roi}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDate(camp.sent_at || camp.created_at)}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewCampaignDetail(camp.id)}>
                      <Eye size={14} /> Analytics
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => setCampaignToDelete(camp)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr><td colSpan="13" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>No campaigns launched yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {campaignToDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Delete Campaign</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setCampaignToDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', fontSize: '0.92rem', lineHeight: '1.5' }}>
                Are you sure you want to delete:
              </p>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '12px' }}>
                "{campaignToDelete.name}"
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCampaignToDelete(null)}>Cancel</button>
              <button 
                className="btn btn-danger" 
                onClick={async () => {
                  try {
                    await api.delete(`/campaigns/${campaignToDelete.id}`);
                    setCampaignToDelete(null);
                    fetchCampaigns();
                  } catch (err) {
                    console.error('Failed to delete campaign:', err);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
