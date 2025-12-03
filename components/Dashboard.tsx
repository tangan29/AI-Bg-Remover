import React from 'react';
import { Button } from './Button';
import { AppMode, User, Theme } from '../types';
import { Plus, Image as ImageIcon, Settings, LogOut, Moon, Sun } from 'lucide-react';

interface DashboardProps {
  user: User;
  setMode: (mode: AppMode) => void;
  onLogout: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, setMode, onLogout, theme, toggleTheme }) => {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-5">
             <div className="h-14 w-14 rounded-full overflow-hidden shadow-lg border-2 border-white dark:border-zinc-800">
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
             </div>
             <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome, {user.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">Let's create something beautiful today.</p>
             </div>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={toggleTheme}
               className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:shadow-md transition-all"
             >
               {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
             </button>
             <Button variant="ghost" onClick={onLogout} icon={<LogOut size={18} />}>
               Sign Out
             </Button>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {/* New Project Card */}
          <div 
            onClick={() => setMode(AppMode.EDITOR)}
            className="group cursor-pointer bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-zinc-800 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity dark:invert">
               <ImageIcon size={180} />
            </div>
            <div className="h-16 w-16 bg-black dark:bg-white rounded-3xl flex items-center justify-center text-white dark:text-black mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
              <Plus size={32} />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">New Project</h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Remove backgrounds, create scenes, and edit photos with AI precision.</p>
            
            <div className="mt-8 flex gap-2">
               <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium text-gray-600 dark:text-gray-300">Auto Remove</span>
               <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-xs font-medium text-rose-600 dark:text-rose-400">Magic Mask</span>
               <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-medium text-indigo-600 dark:text-indigo-400">AI Scenes</span>
            </div>
          </div>
          
           {/* History/Coming Soon */}
          <div className="group bg-gray-50 dark:bg-zinc-900/50 rounded-[2.5rem] p-10 border border-dashed border-gray-200 dark:border-zinc-800 relative overflow-hidden flex flex-col justify-center items-center text-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="h-16 w-16 bg-gray-200 dark:bg-zinc-800 rounded-3xl flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6">
              <Settings size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-400 dark:text-gray-500 mb-2">History & Batch</h3>
            <p className="text-gray-400 dark:text-gray-500">View past edits and process multiple images at once.</p>
            <span className="mt-4 px-4 py-1 bg-gray-200 dark:bg-zinc-800 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-gray-400 dark:text-gray-600 text-sm">
          <p>© 2024 Lumina AI Studio. Crafted with precision.</p>
        </div>
      </div>
    </div>
  );
};