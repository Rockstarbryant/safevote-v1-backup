import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  Vote, 
  Table, 
  BarChart3, 
  PlusCircle,
  Type,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ collapsed: externalCollapsed, onToggle }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(externalCollapsed || false);

  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  const menuItems = [
    { path: '/legacy-create-election', icon: PlusCircle, label: 'Legacy Create Election' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/elections', icon: Vote, label: 'Elections' },
    { path: '/results', icon: BarChart3, label: 'Results' },
    { path: '/tables', icon: Table, label: 'Table List' },
    { path: '/profile', icon: User, label: 'User Profile' },
    { path: '/typography', icon: Type, label: 'Typography' }
   // { path: '/create-election', icon: PlusCircle, label: 'Create Election' },
    ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        <div className="logo-icon">α</div>
        {!collapsed && <span className="logo-text">BlockBallot</span>}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <Icon className="nav-icon" size={20} />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {isActive && <div className="active-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button 
        className="collapse-btn"
        onClick={handleToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <p className="footer-text">Made with ❤️ by Rockstarbryant</p>
          <p className="footer-version">v2.0.0</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;