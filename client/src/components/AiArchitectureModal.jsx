import { useState, useEffect } from 'react';
import { Play, Pause, X, Cpu, Database, Send, RefreshCw, LayoutDashboard, Terminal, MessageSquare } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: '1. Strategy Objective Input',
    desc: 'Marketer enters a natural language goal in the Copilot Workspace (e.g. "Re-engage VIP customers").',
    icon: MessageSquare,
    color: '#3b82f6',
  },
  {
    id: 2,
    title: '2. DB Context Assembly',
    desc: 'The backend queries the SQLite DB to calculate cohort counts, city distribution, and average spend, creating a zero-shot prompt payload.',
    icon: Database,
    color: '#8b5cf6',
  },
  {
    id: 3,
    title: '3. LLM Recommendation / Fallback Core',
    desc: 'The system queries the Gemini API. If the API is unreachable (offline environment), the server falls back to high-fidelity rule-based response generators within 2 seconds.',
    icon: Cpu,
    color: '#ec4899',
  },
  {
    id: 4,
    title: '4. Campaign Dispatcher',
    desc: 'The user triggers the campaign launch. The CRM inserts communications as "sent" and routes payloads to the simulation gateway.',
    icon: Send,
    color: '#10b981',
  },
  {
    id: 5,
    title: '5. Channel Simulators',
    desc: 'The Channel simulation service queues jobs and dispatches multi-stage callbacks (Delivered -> Opened -> Clicked -> Converted) with randomized organic delays.',
    icon: RefreshCw,
    color: '#f59e0b',
  },
  {
    id: 6,
    title: '6. Telemetry Callback Hub',
    desc: 'Incoming webhooks are received by the CRM callback handler, updating individual communication status and aggregating campaign performance statistics.',
    icon: Terminal,
    color: '#06b6d4',
  },
  {
    id: 7,
    title: '7. Live Telemetry Update',
    desc: 'Dashboard and Analytics clients poll the backend every 2.5 seconds, feeding real-time updates (Delivered, Opens, Conversions, ROI) to the charts.',
    icon: LayoutDashboard,
    color: '#14b8a6',
  }
];

export default function AiArchitectureModal({ isOpen, onClose }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (!isOpen) return null;

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div 
        className="modal" 
        style={{ 
          maxWidth: '780px', 
          width: '95%', 
          borderRadius: '16px', 
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} style={{ color: '#ec4899' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Xeno Marketing OS AI Architecture Flow</h3>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ borderRadius: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
            This diagram showcases the complete lifecycle of how user prompts, database context, LLM capabilities/fallbacks, and simulated network telemetries integrate synchronously to deliver real-time CRM updates.
          </p>

          {/* Diagram Area */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-primary)', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', position: 'relative', zIndex: 2 }}>
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                return (
                  <div 
                    key={step.id} 
                    onClick={() => {
                      setActiveStep(idx);
                      setIsPlaying(false);
                    }}
                    style={{
                      width: '130px',
                      background: isActive ? 'var(--bg-card)' : 'transparent',
                      border: `2px solid ${isActive ? step.color : 'var(--border-primary)'}`,
                      borderRadius: '12px',
                      padding: '12px 8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isActive ? `0 10px 15px -3px ${step.color}15, 0 4px 6px -4px ${step.color}15` : 'none',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isActive ? step.color : 'var(--border-secondary)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      transition: 'all 0.3s',
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ 
                      fontSize: '0.78rem', 
                      fontWeight: isActive ? 700 : 500, 
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      lineHeight: 1.2
                    }}>
                      {step.title.split('. ')[1]}
                    </div>

                    {/* Connecting Dot/Arrow for steps except last */}
                    {idx < steps.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        right: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isActive ? step.color : 'var(--border-primary)',
                        zIndex: -1,
                        display: 'none', // hidden on wrap, but kept conceptually
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Simulated Animated Pulse Line Background */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '24px',
              right: '24px',
              height: '2px',
              background: 'var(--border-primary)',
              zIndex: 1,
              transform: 'translateY(-50%)',
              display: 'none'
            }} />
          </div>

          {/* Current Step Description Panel */}
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid var(--border-primary)`,
            borderLeft: `4px solid ${steps[activeStep].color}`,
            borderRadius: '8px',
            padding: '16px',
            transition: 'all 0.3s'
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: steps[activeStep].color, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {steps[activeStep].title}
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {steps[activeStep].desc}
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-secondary)', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={togglePlay}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={onClose}
            style={{ borderRadius: '8px', background: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            Close Flow
          </button>
        </div>
      </div>
    </div>
  );
}
