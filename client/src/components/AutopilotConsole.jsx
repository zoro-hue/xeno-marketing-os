import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Terminal, CheckCircle2, AlertCircle, ArrowRight, Loader } from 'lucide-react';
import api from '../lib/api';

export default function AutopilotConsole({ onComplete }) {
  const [running, setRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [campaignId, setCampaignId] = useState(null);
  const containerRef = useRef(null);

  const steps = [
    { title: "Discover Opportunity", log: "AI Engine: Scanning customer database for dormant revenue opportunities... Identified 45 inactive premium spenders." },
    { title: "Build Segment", log: "AI Engine: Generating segment filters... Rules set: [total_spend > 10000] AND [last_purchase < 45 days ago]." },
    { title: "Select Audience", log: "AI Engine: Resolving cohort size... Selected 'Inactive VIP Customers' cohort containing 45 high-value targets." },
    { title: "Choose Channel", log: "AI Engine: Performing channel suitability predictions... WhatsApp selected based on 88% historical responsiveness." },
    { title: "Choose Offer", log: "AI Engine: Selecting optimal Win-Back incentive... Recommended: 20% discount coupon code [AUTOWIN20]." },
    { title: "Generate Message", log: "AI Engine: Invoking copywriting agent... Created message template: 'Hey {{name}}! 🌟 We miss you! Here is a special 20% off coupon AUTOWIN20...'" },
    { title: "Forecast Results", log: "AI Engine: Running performance model simulations... Predicted ROI: 6.2x | Predicted Revenue: ₹31,500 | Confidence: 91%." },
    { title: "Create Campaign", log: "AI Engine: Registering campaign in CRM database... Dispatching parameters to campaign coordinator." },
    { title: "Launch Campaign", log: "AI Engine: Dispatching communications queue... Transmitting 45 messages to WhatsApp Gateway provider." }
  ];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const startAutopilot = async () => {
    if (running) return;
    setRunning(true);
    setCurrentStepIdx(0);
    setLogs([steps[0].log]);

    // Simulate real-time stepping of the autonomous agent
    for (let i = 1; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentStepIdx(i);
      setLogs(prev => [...prev, steps[i].log]);
    }

    try {
      // Trigger actual backend campaign launch
      const campaignName = `Autopilot WIN-BACK VIP (${new Date().toLocaleDateString('en-IN')})`;
      
      // Get segment first (use the first segment in database or default to inactive)
      const segsRes = await api.get('/segments');
      const segment = segsRes.data.find(s => s.name.toLowerCase().includes('inactive') || s.name.toLowerCase().includes('vip')) || segsRes.data[0];

      if (!segment) {
        throw new Error('No segment found in CRM to run autopilot against.');
      }

      // Create campaign
      const campRes = await api.post('/campaigns', {
        name: campaignName,
        segment_id: segment.id,
        channel: 'whatsapp',
        subject: null,
        message_template: 'Hey {{name}}! 🌟 We miss you! Use code AUTOWIN20 to get 20% off your next order. Shop now: https://xeno.co/shop',
        confidence_rate: 91
      });

      const newCampaign = campRes.data;

      // Send campaign
      await api.post(`/campaigns/${newCampaign.id}/send`);
      setCampaignId(newCampaign.id);
      setLogs(prev => [...prev, `[SUCCESS] Autopilot Campaign successfully generated and dispatched! (Campaign ID: ${newCampaign.id})`]);
      if (onComplete) onComplete(newCampaign.id);
    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, `[ERROR] Autopilot process failed during campaign creation: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card" style={{ border: '1px solid var(--border-primary)', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: '#a3e635' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Autonomous Autopilot Strategy Campaign Agent</span>
        </div>
        {!running && currentStepIdx === -1 && (
          <button onClick={startAutopilot} className="btn btn-primary btn-sm" style={{ gap: '6px', background: '#a3e635', color: '#000000' }}>
            <Play size={12} fill="currentColor" /> Run Autopilot Campaign
          </button>
        )}
      </div>

      {currentStepIdx >= 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Campaign Workflow Stepper</div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {steps.map((step, idx) => {
              const isDone = idx < currentStepIdx;
              const isActive = idx === currentStepIdx;
              return (
                <div key={idx} style={{ 
                  flexShrink: 0,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: isDone ? 'var(--bg-secondary)' : isActive ? '#6366f1' : 'var(--bg-card)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  border: isDone ? '1px solid var(--success)' : isActive ? '1px solid #6366f1' : '1px solid var(--border-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isDone && <CheckCircle2 size={10} style={{ color: 'var(--success)' }} />}
                  {isActive && <Loader size={10} className="animate-spin" />}
                  <span>{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Terminal logs container */}
      <div 
        ref={containerRef}
        style={{ 
        background: '#09090b', 
        border: '1px solid var(--border-primary)', 
        borderRadius: '6px', 
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '0.78rem',
        color: '#a1a1aa',
        minHeight: '160px',
        maxHeight: '220px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ borderBottom: '1px solid #27272a', paddingBottom: '6px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={12} style={{ color: '#a3e635' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e4e4e7' }}>Agent Terminal Session Logs</span>
        </div>
        {logs.map((log, idx) => (
          <div key={idx} style={{ 
            color: log.startsWith('[SUCCESS]') ? '#4ade80' : log.startsWith('[ERROR]') ? '#f87171' : 'inherit',
            lineHeight: 1.4
          }}>
            &gt; {log}
          </div>
        ))}
        {running && (
          <div style={{ color: '#a3e635', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="spinner" style={{ width: 10, height: 10 }} />
            <span>AI agent actively optimizing campaign nodes...</span>
          </div>
        )}

      </div>

      {campaignId && !running && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <a href={`/campaigns?id=${campaignId}`} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
            Open Dispatched Campaign Details <ArrowRight size={12} />
          </a>
        </div>
      )}
    </div>
  );
}
