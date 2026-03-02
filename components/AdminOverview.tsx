import React from 'react';
import { DatabaseUser } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface AdminOverviewProps {
  users: DatabaseUser[];
  setActiveTab: (tab: 'overview' | 'users' | 'discounts') => void;
  getBadgeForPackage: (pkg: string | null) => React.ReactNode;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ users, setActiveTab, getBadgeForPackage }) => {
  const activeUsers = users.filter((u) => u.is_active).length;
  const totalArtCredits = users.reduce((acc, u) => acc + (u.is_admin ? 0 : u.art_credits || 0), 0);
  const totalLoreCredits = users.reduce((acc, u) => acc + (u.is_admin ? 0 : u.lore_credits || 0), 0);

  const getPackageGradient = (pkg: string | null) => {
    switch (pkg?.toLowerCase()) {
      case 'pro': return 'from-[#DEFD41] to-[#DEFD41]/50';
      case 'max': return 'from-[#C084FC] to-[#C084FC]/50';
      case 'private': return 'from-[#40E0D0] to-[#40E0D0]/50';
      case 'cookball': return 'from-[#FF6B00] to-[#FF6B00]/50';
      default: return 'from-slate-400 to-slate-600';
    }
  };

  const packageColors: Record<string, string> = {
    'Starter': '#64748b',
    'Pro': '#DEFD41',
    'Max': '#C084FC',
    'Private': '#40E0D0',
    'Cookball': '#FF6B00'
  };

  const getDonutStyle = () => {
    const pkgs = ['Starter', 'Pro', 'Max', 'Private', 'Cookball'];
    let currentDegree = 0;
    const conicSegments = [];
    
    const totalPkgUsers = users.filter(u => u.package_name || 'Starter').length || 1;

    for (const pkg of pkgs) {
      const count = users.filter((u) => (u.package_name || "Starter") === pkg).length;
      if (count === 0) continue;
      
      const percentage = (count / totalPkgUsers) * 100;
      const degrees = (percentage / 100) * 360;
      
      conicSegments.push(`${packageColors[pkg]} ${currentDegree}deg ${currentDegree + degrees}deg`);
      currentDegree += degrees;
    }
    
    if (conicSegments.length === 0) return { background: '#1e293b' };
    
    return {
      background: `conic-gradient(${conicSegments.join(', ')})`
    };
  };

  const expiredSubscriptions = users.filter(u => {
    if (u.is_admin || !u.subscription_days || !u.subscription_start) return false;
    const start = new Date(u.subscription_start).getTime();
    const daysMs = u.subscription_days * 24 * 60 * 60 * 1000;
    return Date.now() > start + daysMs;
  }).length;

  const activeSubscriptions = users.filter(u => {
    if (u.is_admin || !u.subscription_days || !u.subscription_start) return false;
    const start = new Date(u.subscription_start).getTime();
    const daysMs = u.subscription_days * 24 * 60 * 60 * 1000;
    return Date.now() <= start + daysMs;
  }).length;

  const zeroCreditUsers = users.filter(u => !u.is_admin && u.art_credits === 0 && u.lore_credits === 0).length;

  return (
    <div className="animate-slide-up-cascade">
      {/* Hero Welcome Banner */}
      <div className="relative mb-8 p-8 rounded-[20px] overflow-hidden flex items-center justify-between border border-white/10" 
           style={{ background: 'linear-gradient(90deg, #0B1221 0%, rgba(222, 253, 65, 0.08) 100%)', backdropFilter: 'blur(20px)' }}>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Welcome back, Admin</h2>
          <div className="text-slate-400 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="mx-auto mt-6 flex gap-4">
            <div className="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-white font-medium">{activeUsers} Online</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/5">
                <span className="text-sm text-white font-medium"><span className="text-accent">{totalArtCredits}</span> Global Art Cr.</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 mr-12 hidden md:block">
          <div className="hero-orb"></div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="admin-stat-card-enhanced stat-theme-lime">
          <div className="flex justify-between items-start">
            <div className="icon-container">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <div className="bg-white/5 text-xs px-2 py-1 rounded text-slate-400">Total Users</div>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{users.length}</div>
        </div>

        <div className="admin-stat-card-enhanced stat-theme-green">
          <div className="flex justify-between items-start">
            <div className="icon-container">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div className="bg-white/5 text-xs px-2 py-1 rounded text-slate-400">Active Users</div>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{activeUsers}</div>
        </div>

        <div className="admin-stat-card-enhanced stat-theme-blue">
          <div className="flex justify-between items-start">
            <div className="icon-container">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
            </div>
            <div className="bg-white/5 text-xs px-2 py-1 rounded text-slate-400">Total Art Credits</div>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{totalArtCredits.toLocaleString()}</div>
        </div>

        <div className="admin-stat-card-enhanced stat-theme-purple">
          <div className="flex justify-between items-start">
            <div className="icon-container">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div className="bg-white/5 text-xs px-2 py-1 rounded text-slate-400">Total Lore Credits</div>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{totalLoreCredits.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="admin-panel mb-0 h-full flex flex-col">
          <div className="admin-panel-header flex-shrink-0">
            <h3 className="admin-panel-title">Recent Logins</h3>
            <button onClick={() => setActiveTab('users')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              View All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
          <div className="space-y-3 flex-grow">
            {users
              .filter((u) => u.last_login)
              .sort((a, b) => new Date(b.last_login!).getTime() - new Date(a.last_login!).getTime())
              .slice(0, 5)
              .map((u) => (
                <div key={u.access_code} className="group flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getPackageGradient(u.package_name)} p-[1px]`}>
                      <div className="w-full h-full bg-[#0B1221] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{u.access_code.substring(0, 2)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.95rem] font-bold text-white tracking-wide">{u.access_code}</div>
                      <div className="text-xs text-slate-500 mt-0.5" title={new Date(u.last_login!).toLocaleString()}>
                        {formatDistanceToNow(new Date(u.last_login!), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10">
                    {getBadgeForPackage(u.package_name)}
                  </div>
                </div>
              ))}
            {users.filter((u) => u.last_login).length === 0 && (
              <div className="text-slate-500 text-center py-8 flex flex-col items-center justify-center h-full">
                <svg className="w-12 h-12 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                No recent activity
              </div>
            )}
          </div>
        </div>

        <div className="admin-panel mb-0 h-full flex flex-col">
          <div className="admin-panel-header flex-shrink-0">
            <h3 className="admin-panel-title">Package Distribution</h3>
          </div>
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="donut-chart-container w-full max-w-[300px] mx-auto pb-4 pt-0">
               <div className="donut-chart" style={getDonutStyle()}>
                 <div className="donut-hole">
                   <span className="text-3xl font-black text-white">{users.length}</span>
                   <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">Total Users</span>
                 </div>
               </div>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-3 mt-4 px-4">
              {['Starter', 'Pro', 'Max', 'Private', 'Cookball'].map(pkg => {
                const count = users.filter(u => (u.package_name || 'Starter') === pkg).length;
                if (count === 0) return null;
                const total = users.length || 1;
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={pkg} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full" style={{ background: packageColors[pkg] }}></span>
                       <span className="text-sm text-slate-300 font-medium">{pkg}</span>
                    </div>
                    <span className="text-sm font-bold text-white font-mono">{percent}% <span className="text-xs text-slate-500 font-normal">({count})</span></span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="admin-panel mb-0">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setActiveTab('users'); setTimeout(() => document.querySelector('.admin-btn-accent')?.dispatchEvent(new MouseEvent('click', { bubbles: true })), 100); }} 
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition-all hover:-translate-y-1">
                 <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                 </div>
                 <div className="font-bold text-white text-sm">Create User</div>
                 <div className="text-xs text-slate-500 mt-1">Generate access code</div>
              </button>
              
              <button onClick={() => { setActiveTab('discounts'); setTimeout(() => document.querySelector('.admin-btn-accent')?.dispatchEvent(new MouseEvent('click', { bubbles: true })), 100); }} 
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition-all hover:-translate-y-1">
                 <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                 </div>
                 <div className="font-bold text-white text-sm">Create Discount</div>
                 <div className="text-xs text-slate-500 mt-1">Generate promo code</div>
              </button>
           </div>
         </div>
         
         <div className="admin-panel mb-0">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Subscription Health</h3>
           <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <span className="font-medium text-white text-sm">Expired Subs</span>
                 </div>
                 <span className="font-mono font-bold text-red-400 text-lg">{expiredSubscriptions}</span>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <span className="font-medium text-white text-sm">Active Subs</span>
                 </div>
                 <span className="font-mono font-bold text-green-400 text-lg">{activeSubscriptions}</span>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                    </div>
                    <span className="font-medium text-white text-sm">Zero-Credit Users</span>
                 </div>
                 <span className="font-mono font-bold text-yellow-400 text-lg">{zeroCreditUsers}</span>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
};
