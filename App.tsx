import React, { useState, useEffect } from 'react';
import { User } from './types';
import { initDatabase } from './services/storage';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CalendarView from './pages/Calendar';
import Admin from './pages/Admin';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      // Safety timeout: If DB takes too long, just stop loading to show error or login
      const timeoutId = setTimeout(() => {
        if (isMounted && isLoading) {
          console.warn("Database initialization timed out. Proceeding...");
          setIsLoading(false);
        }
      }, 5000);

      try {
        // 1. Initialize Seed Data (Async check)
        await initDatabase();

        // 2. Check for existing session
        const storedUser = localStorage.getItem('smtms_session');
        if (storedUser && isMounted) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Initialization failed:", error);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    };

    initialize();
    
    return () => { isMounted = false; };
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('smtms_session', JSON.stringify(loggedInUser));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smtms_session');
    setCurrentView('dashboard');
    setViewParams(null);
  };

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    if (params) {
      setViewParams(params);
    } else {
      setViewParams(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="loader mb-4"></div>
        <p className="text-slate-500 text-sm animate-pulse">Initializing Database...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Router Switch
  const renderView = () => {
    switch (currentView) {
      case 'dashboard': 
        return <Dashboard onNavigate={handleNavigate} />;
      case 'campaigns': 
        return <Campaigns initialExpandedId={viewParams?.campaignId} />;
      case 'calendar': 
        return <CalendarView onNavigate={handleNavigate} />;
      case 'admin': 
        return user.role === 'Admin' ? <Admin /> : <Dashboard onNavigate={handleNavigate} />;
      default: 
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
};

export default App;