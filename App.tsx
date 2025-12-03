import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { AppMode, User, Theme } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.AUTH);
  const [theme, setTheme] = useState<Theme>('light');

  // Handle system preference on load and apply theme class to html
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Check system preference initially if no saved preference (simplified here)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Effect to actually toggle the class on the HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setMode(AppMode.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setMode(AppMode.AUTH);
  };

  const renderMode = () => {
    switch (mode) {
      case AppMode.AUTH:
        return <Auth onLogin={handleLogin} />;
      case AppMode.DASHBOARD:
        return user ? (
          <Dashboard 
            user={user} 
            setMode={setMode} 
            onLogout={handleLogout} 
            theme={theme}
            toggleTheme={toggleTheme}
          />
        ) : <Auth onLogin={handleLogin} />;
      case AppMode.EDITOR:
        return <Editor onBack={() => setMode(AppMode.DASHBOARD)} />;
      default:
        return <Auth onLogin={handleLogin} />;
    }
  };

  return (
    <div className="antialiased min-h-screen bg-white dark:bg-black transition-colors duration-300 text-slate-900 dark:text-slate-100">
      {renderMode()}
    </div>
  );
}

export default App;