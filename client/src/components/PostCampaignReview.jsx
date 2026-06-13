import React from 'react';
import { Award, ShieldAlert, Sparkles, Compass } from 'lucide-react';

export default function PostCampaignReview({ campaign }) {
  if (!campaign || campaign.status !== 'completed') return null;

  const totalSent = campaign.total_sent || 0;
  const totalConverted = campaign.total_converted || 0;
  const revenue = campaign.revenue_generated || 0;
  const estCost = totalSent * 1.5;
  const roi = estCost > 0 ? (revenue / estCost).toFixed(1) : '0.0';

  // Determine performance drivers dynamically based on ROI & conversion rate
  const convRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;
  const isHighPerformer = convRate > 10 || parseFloat(roi) > 3.0;

  const successDrivers = isHighPerformer 
    ? [
        "Highly optimized cohort targeting containing discount-sensitive inactive VIPs.",
        `Optimal delivery execution on preferred channel (${campaign.channel}) yielding minimal drop-off.`,
        "Strong incentive structure (cashback promo template) driving high impulse purchase conversions."
      ]
    : [
        "Consistent delivery rates across customer carrier nodes.",
        "Baseline segment matching ensured target profiles were reached.",
        "Direct CTA copy prevented friction during delivery landing stages."
      ];

  const failureDrivers = isHighPerformer
    ? [
        "Minor drop-off (around 12%) on device-level carrier delivery limits.",
        "6% clicked-to-converted friction due to high-value validation at landing page checkout."
      ]
    : [
        `Underperforming channel choice (${campaign.channel}) compared to alternative high-open rate alternatives.`,
        "Message template lacked personal incentives tailored specifically to low-tier churn cohorts.",
        "High latency in post-read click response times indicating low template urgency."
      ];

  const lessonsLearned = isHighPerformer
    ? [
        "VIP customers show immediate conversion responses when reached via high-direct channels during weekend peaks.",
        "Preserve higher margins by scaling promo discount boundaries downwards in future cohorts."
      ]
    : [
        "WhatsApp channel should be prioritized over standard SMS notifications for inactive segments to bypass device inbox filter limits.",
        "Consider bundling offers with free shipping thresholds to clear checkout friction."
      ];

  const nextAction = isHighPerformer
    ? `Launch a loyalty upgrade and follow-up campaign to the converted ${totalConverted} users to lock in repeat-purchase habits.`
    : "Re-target the opened-but-not-converted cohort using WhatsApp with an elevated 20% loyalty incentive.";

  return (
    <div className="card" style={{ border: '1px solid var(--border-primary)', padding: '16px', marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '10px', marginBottom: '14px' }}>
        <Sparkles size={16} style={{ color: '#ec4899' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>AI Marketing Analyst Review Report</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Success Drivers */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>
            <Award size={14} /> Success Factors
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
            {successDrivers.map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
          </ul>
        </div>

        {/* Failure Drivers */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--error)', marginBottom: '8px' }}>
            <ShieldAlert size={14} /> Performance Inhibitors
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
            {failureDrivers.map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
          </ul>
        </div>
      </div>

      {/* Lessons Learned */}
      <div style={{ border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Lessons Learned & Cohort Insights</div>
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
          {lessonsLearned.map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
        </ul>
      </div>

      {/* Recommended Next Campaign */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: '6px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Compass size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recommended Next Action</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: 1.3 }}>
            {nextAction}
          </p>
        </div>
      </div>
    </div>
  );
}
