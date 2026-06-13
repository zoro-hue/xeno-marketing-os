import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, Megaphone, BarChart3, Sparkles,
  Search, Sun, Moon, Menu, X, Cpu
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Copilot from './pages/Copilot';
import CampaignDetail from './pages/CampaignDetail';
import AiArchitectureModal from './components/AiArchitectureModal';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/segments', label: 'Segments', icon: Target },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const [archModalOpen, setArchModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 25
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#171717" />
            <path d="M9 11L16 20L23 11" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="11" r="2" fill="#a3a3a3" />
          </svg>
          <h1>Xeno</h1>
          <span>CRM</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: '8px' }}>Intelligence</div>
          <NavLink
            to="/copilot"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Sparkles />
            AI Copilot
          </NavLink>
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-secondary)' }}>
          <div className="nav-item" style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
            v1.0.0 · AI-Native
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }}>
              {sidebarOpen ? <X /> : <Menu />}
            </button>
            <div className="search-bar">
              <Search />
              <input 
                type="text" 
                placeholder="Search customers..." 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/customers?search=${encodeURIComponent(e.target.value)}`);
                  }
                }}
              />
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" id="theme-toggle">
              {theme === 'light' ? <Moon /> : <Sun />}
            </button>
            <div className="user-avatar" title="Marketer">M</div>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/copilot" element={<Copilot />} />
          </Routes>
        </div>
      </div>

      {/* Floating AI Architecture Button */}
      <button 
        onClick={() => setArchModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 40,
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="View AI Architecture Flow"
        className="icon-btn hover:scale-105"
      >
        <Cpu size={20} style={{ color: '#ec4899' }} />
      </button>

      <AiArchitectureModal isOpen={archModalOpen} onClose={() => setArchModalOpen(false)} />
    </div>
  );
}
