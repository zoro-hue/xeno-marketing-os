import React from 'react';
import { HelpCircle, Users, Send, Gift, Calendar, BarChart2 } from 'lucide-react';

export default function Explainability({ 
  audienceReason, 
  channelReason, 
  offerReason, 
  timingReason, 
  predictionReason 
}) {
  const items = [
    {
      label: "Why this audience?",
      icon: Users,
      reason: audienceReason || "Selected due to purchase latency (last buy > 45 days) combined with high historically proven engagement.",
      color: "#3b82f6"
    },
    {
      label: "Why this channel?",
      icon: Send,
      reason: channelReason || "WhatsApp historically shows a 2.4x higher conversion rate for inactive segments than email.",
      color: "#16a34a"
    },
    {
      label: "Why this offer?",
      icon: Gift,
      reason: offerReason || "A 15% cashback offer matches the average cart size threshold to yield a positive ROI without profit erosion.",
      color: "#eab308"
    },
    {
      label: "Why this timing?",
      icon: Calendar,
      reason: timingReason || "Marketers yield 18% higher clicks on Friday afternoon as weekend browsing traffic begins to spike.",
      color: "#ec4899"
    },
    {
      label: "Why this forecast?",
      icon: BarChart2,
      reason: predictionReason || "Model forecasts are generated using previous campaigns targeting similar demographics under identical discount thresholds.",
      color: "#8b5cf6"
    }
  ];

  return (
    <div className="card" style={{ marginTop: '16px', border: '1px solid var(--border-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '14px' }}>
        <HelpCircle size={16} style={{ color: 'var(--text-primary)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>AI Recommendation Reasoning</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: `1px solid var(--border-primary)`, 
              padding: '6px', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <item.icon size={14} style={{ color: item.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                {item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
