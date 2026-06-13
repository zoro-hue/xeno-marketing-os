import React, { useState, useEffect } from 'react';
import { Target, Users, Send, Gift, Calendar, TrendingUp, Sparkles, SendHorizontal, AlertCircle, X, ChevronRight, Check } from 'lucide-react';
import api from '../lib/api';
import Explainability from './Explainability';

export default function CampaignStrategyWorkspaceModal({ isOpen, onClose, opportunity }) {
  const [activeStep, setActiveStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [launchedId, setLaunchedId] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setGoal(opportunity.goal_prompt || `Optimize conversions for segment: ${opportunity.name}`);
      setCampaignName(`AI Strategic: ${opportunity.name} (${new Date().toLocaleDateString('en-IN')})`);
      setActiveStep(0);
      setStrategy(null);
      setLaunchedId(null);
    }
  }, [opportunity]);

  if (!isOpen || !opportunity) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/campaign-recommendations', { goal });
      setStrategy(res.data);
      setActiveStep(1); // advance to results workspace step
    } catch (err) {
      console.error('Failed to generate recommendation strategy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!strategy) return;
    setDispatching(true);
    try {
      // 1. Create campaign
      const createRes = await api.post('/campaigns', {
        name: campaignName,
        segment_id: strategy.segment_id,
        channel: strategy.recommended_channel.channel,
        subject: strategy.suggested_message.subject,
        message_template: strategy.suggested_message.message,
        confidence_rate: strategy.analysis.confidence_score
      });
      const newCamp = createRes.data;

      // 2. Dispatch campaign
      await api.post(`/campaigns/${newCamp.id}/send`);
      setLaunchedId(newCamp.id);
      setActiveStep(2); // advance to complete step
    } catch (err) {
      console.error('Launch failed:', err);
    } finally {
      setDispatching(false);
    }
  };

  const steps = ["Configure Goal", "AI Recommendation & Rationale", "Dispatch Campaign"];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--border-primary)',
        padding: '24px',
        animation: 'slideUp 200ms ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#6366f1' }} /> Campaign Strategy Workspace
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Identify high-performing segment settings & optimize execution layout</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>✕</button>
        </div>

        {/* Stepper progress indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ 
              flex: 1, 
              height: '4px', 
              background: idx <= activeStep ? 'var(--success)' : 'var(--border-primary)',
              borderRadius: '2px',
              transition: 'background 0.2s ease'
            }} />
          ))}
        </div>

        {/* STEP 0: Configure Goal */}
        {activeStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Specify Campaign Business Objective</label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: '100px', fontSize: '0.9rem' }}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what you want to achieve with this audience (e.g. Win back inactive high value VIPs, launch early premium winter collections, etc.)"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '12px', alignItems: 'center' }}>
              <Sparkles size={18} style={{ color: '#eab308', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong>Opportunity Target:</strong> {opportunity.name} ({opportunity.audience_size} customers, ₹{opportunity.potential_revenue.toLocaleString()} potential revenue).
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !goal.trim()}>
                {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Sparkles size={14} /> Analyze & Recommend</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Analysis Workspace */}
        {activeStep === 1 && strategy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Left Column: recommendations info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Business Goal</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{goal}</div>
                </div>

                <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Audience Recommendation</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{strategy.analysis.audience_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Reason: {strategy.analysis.reasoning}</div>
                </div>

                <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Channel & Offer Selection</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>{strategy.recommended_channel.channel}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{strategy.strategy.offer}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Offer Justification: {strategy.strategy.explain_offer}
                  </div>
                </div>
              </div>

              {/* Right Column: predictions & template */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Revenue Forecast Prediction */}
                <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: '6px', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>AI Revenue & Delivery Forecast</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div style={{ border: '1px solid var(--border-secondary)', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected Revenue</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>₹{strategy.predictions.expected_revenue.toLocaleString()}</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-secondary)', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expected ROI</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{strategy.predictions.expected_roi}x</div>
                    </div>
                  </div>
                </div>

                {/* Campaign Draft Template */}
                <div style={{ border: '1px solid var(--border-primary)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Generated Campaign Message Copy</div>
                  {strategy.suggested_message.subject && (
                    <div style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Subject:</span> <strong>{strategy.suggested_message.subject}</strong>
                    </div>
                  )}
                  <div style={{ 
                    padding: '8px 10px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '110px',
                    overflowY: 'auto'
                  }}>
                    {strategy.suggested_message.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Explainability component inclusion */}
            <Explainability
              audienceReason={strategy.analysis.reasoning}
              channelReason={strategy.recommended_channel.reasoning}
              offerReason={strategy.strategy.explain_offer}
              timingReason={strategy.strategy.explain_timing}
              predictionReason={`Model predicts ₹${strategy.predictions.expected_revenue.toLocaleString()} revenue based on past responses within segment cohorts.`}
            />

            {/* Form controls & dispatcher */}
            <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Set campaign dispatcher name..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  style={{ fontSize: '0.85rem', maxWidth: '300px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveStep(0)}>Back</button>
                <button className="btn btn-primary btn-sm" onClick={handleLaunch} disabled={dispatching || !campaignName.trim()}>
                  {dispatching ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <><SendHorizontal size={14} /> Launch Campaign</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Completed */}
        {activeStep === 2 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              background: 'var(--success)', 
              color: 'var(--bg-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0' }}>Campaign Launched successfully!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 24px 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.4 }}>
              The strategic campaign dispatcher successfully registered the queue logs. Check delivery rates and real-time responses under Campaigns.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Close Workspace</button>
              <a href={`/campaigns?id=${launchedId}`} className="btn btn-primary btn-sm" onClick={onClose}>
                Open Campaign Detail Center
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
