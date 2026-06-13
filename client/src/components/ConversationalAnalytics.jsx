import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, AlertCircle, TrendingUp, Users, RefreshCw } from 'lucide-react';
import api from '../lib/api';

export default function ConversationalAnalytics() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hi! I am your Xeno CRM intelligence analyst. Ask me anything about your campaigns, customers, or revenue opportunities.',
      suggestions: [
        "Which campaign generated highest ROI?",
        "Which audience generated most revenue?",
        "Which customers may churn?",
        "What should I do next?"
      ]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (textToSend) => {
    const activeText = textToSend || query;
    if (!activeText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: activeText }]);
    setQuery('');
    setLoading(true);

    try {
      // Fetch dynamic analytics query response
      const res = await api.post('/ai/query-crm', { question: activeText });
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: res.data.answer,
        data: res.data.data,
        type: res.data.type
      }]);
    } catch (err) {
      console.error('Query failed:', err);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Sorry, I encountered an issue querying the CRM database. Please try another question or sync the dashboard.',
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderDataPayload = (msg) => {
    if (!msg.data) return null;

    if (msg.type === 'campaigns') {
      return (
        <div style={{ marginTop: '10px', border: '1px solid var(--border-primary)', borderRadius: '6px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
          <table className="table" style={{ fontSize: '0.78rem', margin: 0 }}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Revenue</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {msg.data.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td><span className="badge badge-neutral">{item.channel}</span></td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{item.revenue_generated.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{item.roi}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (msg.type === 'segments') {
      return (
        <div style={{ marginTop: '10px', border: '1px solid var(--border-primary)', borderRadius: '6px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
          <table className="table" style={{ fontSize: '0.78rem', margin: 0 }}>
            <thead>
              <tr>
                <th>Segment Name</th>
                <th>Customers</th>
                <th>Revenue Potential</th>
              </tr>
            </thead>
            <tbody>
              {msg.data.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.customer_count}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{item.potential_revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (msg.type === 'churn') {
      return (
        <div style={{ marginTop: '10px', border: '1px solid var(--border-primary)', borderRadius: '6px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
          <table className="table" style={{ fontSize: '0.78rem', margin: 0 }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Preferred</th>
                <th>LTV</th>
                <th>Churn Risk</th>
              </tr>
            </thead>
            <tbody>
              {msg.data.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{item.email}</div>
                  </td>
                  <td><span className="badge badge-neutral">{item.preferred_channel}</span></td>
                  <td>₹{item.lifetime_value.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--error)' }}>{item.churn_risk}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (msg.type === 'recommendation') {
      return (
        <div style={{ marginTop: '10px', padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <TrendingUp size={20} style={{ color: '#ec4899', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Next Best Marketing Campaign Action</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {msg.data.recommended_action}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Expected Revenue: <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{msg.data.expected_revenue.toLocaleString()}</span> | Confidence: {msg.data.confidence}%
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Left side: Conversational Chat Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '340px', border: '1px solid var(--border-primary)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '12px', marginBottom: '12px' }}>
          <Sparkles size={16} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Conversational Analytics Advisor</span>
        </div>

        {/* Message Stream */}
        <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '12px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ 
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.sender === 'user' ? 'var(--text-primary)' : 'var(--bg-secondary)',
              color: msg.sender === 'user' ? 'var(--bg-primary)' : 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border-primary)',
              fontSize: '0.85rem',
              lineHeight: 1.4
            }}>
              <div>{msg.text}</div>
              
              {/* Suggestions */}
              {msg.suggestions && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {msg.suggestions.map((sug, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleSubmit(sug)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom payloads */}
              {renderDataPayload(msg)}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} className="animate-spin" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Analyzing CRM data...</span>
            </div>
          )}
        </div>

        {/* Input controls */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-secondary)', paddingTop: '10px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ask about ROI, churn risk, opportunities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{ flex: 1, fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }} disabled={loading || !query.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
