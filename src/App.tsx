/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, Settings, BookOpen, Database, Github, HelpCircle } from 'lucide-react';
import SearchPortal from './components/SearchPortal';
import DesktopGenerator from './components/DesktopGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'generator'>('search');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-900 selection:text-white" id="app-root">
      {/* Universal Sticky Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <Database size={18} />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">Result Indexer System</span>
              <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest block">GitHub Pages Compliant</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              id="nav-search-btn"
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <BookOpen size={14} />
              <span>Result Inquiry</span>
            </button>
            <button
              id="nav-generator-btn"
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Settings size={14} />
              <span>Database Compiler</span>
            </button>
          </nav>

          {/* Social or GitHub reference */}
          <div className="hidden md:flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
            <Github size={18} />
            <span className="text-xs font-mono">v2.0 Static Core</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full bg-slate-50/50 relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

        <div className="relative z-10 w-full">
          {activeTab === 'search' ? (
            <motion.div
              key="search-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <SearchPortal onNavigateToGenerator={() => setActiveTab('generator')} />
            </motion.div>
          ) : (
            <motion.div
              key="generator-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <DesktopGenerator onNavigateToSearch={() => setActiveTab('search')} />
            </motion.div>
          )}
        </div>
      </main>

      {/* Universal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Examination Board Results Division. All Rights Reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span>Static Engine: Active</span>
            <span>•</span>
            <span>Firestore reads: 0</span>
            <span>•</span>
            <span>Monthly Cost: $0.00</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
