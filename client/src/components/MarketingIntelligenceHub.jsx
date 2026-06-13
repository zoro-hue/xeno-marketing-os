import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../lib/api';

export default function MarketingIntelligenceHub() {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchIntelligence = async () => {
    try {
      const res = await api.get('/ai/marketing-intelligence');
      setIntel(res.data);
    } catch (err) {
      console.error('Failed to fetch intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border-primary)' }}>
        <RefreshCw className="animate-spin" style={{ margin: '0 auto 8px auto', color: 'var(--text-secondary)' }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Scanning customer intelligence database...</p>
      </div>
    );
  }

  if (!intel) return null;

  const cards = [
    {
      title: "Top Opportunity",
      value: intel.topOpportunity.name,
      metric: `₹${intel.topOpportunity.revenue.toLocaleString()} potential`,
      reason: "High cohort size + historically strong WhatsApp responsiveness yields 91% conversion probability.",
      confidence: intel.topOpportunity.confidence,
      icon: Sparkles,
      color: "#a3e635",
      actionPrompt: intel.topOpportunity.prompt
    },
    {
      title: "Biggest Revenue Drive",
      value: intel.biggestRevenue.name,
      metric: `₹${intel.biggestRevenue.revenue.toLocaleString()} potential`,
      reason: "VIP premium collections match average spend profile of top-tier customer loyalty brackets.",
      confidence: intel.biggestRevenue.confidence,
      icon: TrendingUp,
      color: "#38bdf8",
      actionPrompt: intel.biggestRevenue.prompt
    },
    {
      title: "Highest Churn Risk Cohort",
      value: intel.highRisk.name,
      metric: `${intel.highRisk.count} high-risk customers`,
      reason: "Last purchase date exceeds 90 days. High probability of complete customer loss without callback win-back offers.",
      confidence: intel.highRisk.confidence,
      icon: AlertTriangle,
      color: "#f87171",
      actionPrompt: intel.highRisk.prompt
    },
    {
      title: "Best Performing Segment",
      value: intel.bestSegment.name,
      metric: `${intel.bestSegment.convRate}% conversion rate`,
      reason: "Highly loyal repeating cohort displaying low price-elasticity and high organic repeat purchase patterns.",
      confidence: intel.bestSegment.confidence,
      icon: CheckCircle,
      color: "#34d399",
      actionPrompt: "Upgrade loyal frequent buyers with exclusive VIP benefits"
    }
  ];

  return (
    <div className="card mb-6" style={{ border: '1px solid var(--border-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', padding: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: '#ec4899' }} /> Marketing Intelligence Hub
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Autonomous revenue opportunities and proactive risk alerts</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '16px' }}>
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-primary)', 
              borderRadius: 'var(--radius-md)', 
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{card.title}</span>
                  <Icon size={14} style={{ color: card.color }} />
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>{card.value}</h4>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', marginBottom: '8px' }}>{card.metric}</div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>{card.reason}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-secondary)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Confidence: <span style={{ color: 'var(--text-primary)' }}>{card.confidence}%</span>
                </span>
                <button 
                  onClick={() => navigate('/copilot', { state: { goalPrompt: card.actionPrompt } })}
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '2px 6px', fontSize: '0.72rem', gap: '3px' }}
                >
                  Analyze <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
