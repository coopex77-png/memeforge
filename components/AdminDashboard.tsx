import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DatabaseUser, DiscountCode } from '../types';

interface AdminDashboardProps {
    onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [users, setUsers] = useState<DatabaseUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAccessCode, setNewAccessCode] = useState('');
    const [newArtCredits, setNewArtCredits] = useState(10);
    const [newLoreCredits, setNewLoreCredits] = useState(5);
    const [newSubValue, setNewSubValue] = useState<number | ''>('');
    const [newSubUnit, setNewSubUnit] = useState<'m' | 'h' | 'd' | 'w'>('d');
    const [newPackageName, setNewPackageName] = useState<string>('Starter');
    const [editingCode, setEditingCode] = useState<{ old: string; new: string } | null>(null);
    const [editingSub, setEditingSub] = useState<{ access_code: string; value: number | ''; unit: 'm' | 'h' | 'd' | 'w' } | null>(null);
    const [editingCredits, setEditingCredits] = useState<{ access_code: string; type: 'art' | 'lore'; value: string } | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Discount Code states
    const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
    const [newDiscountCode, setNewDiscountCode] = useState('');
    const [newDiscountPercentage, setNewDiscountPercentage] = useState<number>(10);
    const [newDiscountDurationValue, setNewDiscountDurationValue] = useState<number | ''>('');
    const [newDiscountDurationUnit, setNewDiscountDurationUnit] = useState<'m' | 'h' | 'd' | 'w'>('d');
    const [loadingDiscount, setLoadingDiscount] = useState(true);
    const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);

    // New UI states
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'discounts'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [packageFilter, setPackageFilter] = useState<string>('All');
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateDiscount, setShowCreateDiscount] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchDiscountCodes();

        const channel = supabase
            .channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setUsers(prev => [payload.new as DatabaseUser, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setUsers(prev => prev.map(u => u.access_code === payload.new.access_code ? (payload.new as DatabaseUser) : u));
                } else if (payload.eventType === 'DELETE') {
                    setUsers(prev => prev.filter(u => u.access_code !== payload.old.access_code));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setUsers(data as DatabaseUser[]);
        }
        setLoading(false);
    };

    const fetchDiscountCodes = async () => {
        const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setDiscountCodes(data as DiscountCode[]);
        }
        setLoadingDiscount(false);
    };

    const handleCreateDiscountCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDiscountCode.trim() || newDiscountPercentage < 0 || newDiscountPercentage > 100) return;

        let expiresAt = null;
        if (typeof newDiscountDurationValue === 'number' && newDiscountDurationValue > 0) {
            const date = new Date();
            if (newDiscountDurationUnit === 'm') date.setMinutes(date.getMinutes() + newDiscountDurationValue);
            else if (newDiscountDurationUnit === 'h') date.setHours(date.getHours() + newDiscountDurationValue);
            else if (newDiscountDurationUnit === 'd') date.setDate(date.getDate() + newDiscountDurationValue);
            else if (newDiscountDurationUnit === 'w') date.setDate(date.getDate() + newDiscountDurationValue * 7);
            expiresAt = date.toISOString();
        }

        try {
            const { error } = await supabase.from('discount_codes').insert([{
                code: newDiscountCode.toUpperCase(),
                percentage: newDiscountPercentage,
                is_active: true,
                expires_at: expiresAt
            }]);
            if (error) {
                alert('Error creating discount code. Make sure it is unique. ' + error.message);
            } else {
                setNewDiscountCode('');
                setNewDiscountPercentage(10);
                setNewDiscountDurationValue('');
                setNewDiscountDurationUnit('d');
                setShowCreateDiscount(false);
                fetchDiscountCodes();
                // We show an inline alert here for simplicity. Real apps might use toasts.
                alert('Discount Code created successfully.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDiscountCode = async () => {
        if (!discountToDelete) return;
        try {
            const { error } = await supabase.from('discount_codes').delete().eq('id', discountToDelete);
            if (error) {
                alert('Error deleting discount code: ' + error.message);
            } else {
                setDiscountCodes(prev => prev.filter(dc => dc.id !== discountToDelete));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDiscountToDelete(null);
        }
    };

    const handleToggleDiscount = async (id: string, currentValue: boolean) => {
        const { error } = await supabase.from('discount_codes').update({ is_active: !currentValue }).eq('id', id);
        if (!error) {
            setDiscountCodes(prev => prev.map(dc => dc.id === id ? { ...dc, is_active: !currentValue } : dc));
        }
    };

    const generateAccessCode = () => {
        setNewAccessCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAccessCode.trim()) return;

        try {
            const { error } = await supabase.from('users').insert([{
                access_code: newAccessCode,
                art_credits: newArtCredits,
                lore_credits: newLoreCredits,
                is_active: true,
                can_use_art: true,
                can_use_scrape: true,
                can_use_news_scrape: false,
                subscription_days: calculateDays(newSubValue, newSubUnit),
                package_name: newPackageName,
            }]);
            if (error) {
                alert('Error creating user: ' + error.message);
            } else {
                setNewAccessCode('');
                setNewArtCredits(10);
                setNewLoreCredits(5);
                setNewSubValue('');
                setNewPackageName('Starter');
                setShowCreateUser(false);
                alert('User created successfully.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (accessCode: string, field: keyof DatabaseUser, currentValue: boolean) => {
        const updates: Partial<DatabaseUser> = { [field]: !currentValue };

        if (field === 'can_use_scrape' && !currentValue) {
            updates.can_use_news_scrape = false;
        } else if (field === 'can_use_news_scrape' && !currentValue) {
            updates.can_use_scrape = false;
        }

        await supabase.from('users').update(updates).eq('access_code', accessCode);
    };

    const handleUpdateCredits = async (accessCode: string, field: 'art_credits' | 'lore_credits', action: 'add' | 'sub') => {
        const user = users.find(u => u.access_code === accessCode);
        if (!user || user.is_admin) return;

        const newVal = action === 'add' ? user[field] + 1 : user[field] - 1;
        await supabase.from('users').update({ [field]: newVal }).eq('access_code', accessCode);
    };

    const handleSaveCredits = async (accessCode: string, field: 'art_credits' | 'lore_credits') => {
        if (!editingCredits || editingCredits.value.trim() === '') return;

        const newVal = parseInt(editingCredits.value, 10);
        if (isNaN(newVal)) return;

        try {
            await supabase.from('users').update({ [field]: newVal }).eq('access_code', accessCode);
        } catch (err) {
            console.error(err);
        } finally {
            setEditingCredits(null);
        }
    };

    const handleUpdatePackage = async (accessCode: string, packageName: string) => {
        try {
            const { error } = await supabase.from('users').update({ package_name: packageName }).eq('access_code', accessCode);
            if (error) alert('Error updating package: ' + error.message);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveAccessCode = async (oldCode: string) => {
        if (!editingCode || !editingCode.new.trim() || editingCode.new === oldCode) {
            setEditingCode(null);
            return;
        }

        try {
            const { error } = await supabase.from('users').update({ access_code: editingCode.new }).eq('access_code', oldCode);
            if (error) {
                alert('Error updating code: ' + error.message);
            } else {
                setEditingCode(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const calculateDays = (val: number | '', unit: 'm' | 'h' | 'd' | 'w') => {
        if (val === '' || isNaN(Number(val))) return null;
        const numVal = Number(val);
        switch (unit) {
            case 'm': return numVal / (24 * 60);
            case 'h': return numVal / 24;
            case 'w': return numVal * 7;
            default: return numVal;
        }
    };

    const handleSaveSub = async (accessCode: string) => {
        if (!editingSub || editingSub.access_code !== accessCode) return;

        try {
            const val = calculateDays(editingSub.value, editingSub.unit);
            const { error } = await supabase.from('users').update({ subscription_days: val }).eq('access_code', accessCode);
            if (error) {
                alert('Error updating subscription: ' + error.message);
            } else {
                setEditingSub(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        const accessCode = userToDelete;
        try {
            const { error } = await supabase.from('users').delete().eq('access_code', accessCode);
            if (error) {
                alert('Error deleting user: ' + error.message);
            } else {
                setUsers(prev => prev.filter(u => u.access_code !== accessCode));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUserToDelete(null);
        }
    };

    const formatSubscription = (days: number | null) => {
        if (!days) return 'Unlimited';
        if (days >= 7) return `${Number(days / 7).toFixed(1).replace(/\.0$/, '')}w`;
        if (days >= 1) return `${Number(days).toFixed(1).replace(/\.0$/, '')}d`;
        if (days * 24 >= 1) return `${Math.round(days * 24)}h`;
        return `${Math.round(days * 24 * 60)}m`;
    };

    const getRemainingTimeStr = (user: DatabaseUser) => {
        if (!user.subscription_days || !user.subscription_start) return null;
        const start = new Date(user.subscription_start).getTime();
        const expiry = start + (user.subscription_days * 24 * 60 * 60 * 1000);
        const diffMs = expiry - Date.now();
        if (diffMs <= 0) return null;
        return formatSubscription(diffMs / (24 * 60 * 60 * 1000));
    };

    const isSubscriptionExpired = (user: DatabaseUser) => {
        if (user.is_admin || !user.subscription_days || !user.subscription_start) return false;
        const start = new Date(user.subscription_start).getTime();
        const daysMs = user.subscription_days * 24 * 60 * 60 * 1000;
        return Date.now() > start + daysMs;
    };

    const getBadgeClass = (packageName: string | null) => {
        switch (packageName?.toLowerCase()) {
            case 'pro': return 'badge-pro';
            case 'max': return 'badge-max';
            case 'private': return 'badge-private';
            case 'cookball': return 'badge-cookball';
            default: return 'badge-starter';
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.access_code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPackage = packageFilter === 'All' || (u.package_name || 'Starter') === packageFilter;
        return matchesSearch && matchesPackage;
    });

    const getBadgeForPackage = (pkg: string | null) => (
        <span className={`badge ${getBadgeClass(pkg)}`}>{pkg || 'Starter'}</span>
    );

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <span className="admin-logo">⚡</span>
                    <h1>MemeForge</h1>
                    <span className="admin-badge">Admin</span>
                </div>
                <nav className="admin-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <span className="text-lg">📊</span> Overview
                    </button>
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        <span className="text-lg">👥</span> Users
                    </button>
                    <button className={activeTab === 'discounts' ? 'active' : ''} onClick={() => setActiveTab('discounts')}>
                        <span className="text-lg">🏷️</span> Discounts
                    </button>
                </nav>
                <button className="admin-back-btn" onClick={onBack}>
                    ← Back to App
                </button>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">Dashboard Overview</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="admin-stat-card stat-accent">
                                <div className="admin-stat-icon text-2xl">👥</div>
                                <div className="admin-stat-value">{users.length}</div>
                                <div className="admin-stat-label">Total Users</div>
                            </div>
                            <div className="admin-stat-card text-[#4ade80] [&_.admin-stat-icon]:text-[#4ade80] [&_.admin-stat-icon]:border-[#4ade80]/20 [&_.admin-stat-icon]:bg-[#4ade80]/10">
                                <div className="admin-stat-icon text-2xl">🟢</div>
                                <div className="admin-stat-value">{users.filter(u => u.is_active).length}</div>
                                <div className="admin-stat-label">Active Users</div>
                            </div>
                            <div className="admin-stat-card text-[#38bdf8] [&_.admin-stat-icon]:text-[#38bdf8] [&_.admin-stat-icon]:border-[#38bdf8]/20 [&_.admin-stat-icon]:bg-[#38bdf8]/10">
                                <div className="admin-stat-icon text-2xl">🎨</div>
                                <div className="admin-stat-value">{users.reduce((acc, u) => acc + (u.is_admin ? 0 : (u.art_credits || 0)), 0)}</div>
                                <div className="admin-stat-label">Total Art Credits</div>
                            </div>
                            <div className="admin-stat-card text-[#a78bfa] [&_.admin-stat-icon]:text-[#a78bfa] [&_.admin-stat-icon]:border-[#a78bfa]/20 [&_.admin-stat-icon]:bg-[#a78bfa]/10">
                                <div className="admin-stat-icon text-2xl">🧠</div>
                                <div className="admin-stat-value">{users.reduce((acc, u) => acc + (u.is_admin ? 0 : (u.lore_credits || 0)), 0)}</div>
                                <div className="admin-stat-label">Total Lore Credits</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="admin-panel">
                                <div className="admin-panel-header">
                                    <h3 className="admin-panel-title">Recent Logins</h3>
                                </div>
                                <div className="space-y-3">
                                    {users.filter(u => u.last_login).sort((a, b) => new Date(b.last_login!).getTime() - new Date(a.last_login!).getTime()).slice(0, 5).map(u => (
                                        <div key={u.access_code} className="flex justify-between items-center bg-[rgba(0,0,0,0.2)] p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                                                    {u.access_code.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="text-[0.95rem] font-bold text-white tracking-wide">{u.access_code}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{new Date(u.last_login!).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            {getBadgeForPackage(u.package_name)}
                                        </div>
                                    ))}
                                    {users.filter(u => u.last_login).length === 0 && (
                                        <div className="text-slate-500 text-center py-4">No recent logins</div>
                                    )}
                                </div>
                            </div>

                            <div className="admin-panel">
                                <div className="admin-panel-header">
                                    <h3 className="admin-panel-title">Package Distribution</h3>
                                </div>
                                <div className="space-y-4 mt-2">
                                    {['Starter', 'Pro', 'Max', 'Private', 'Cookball'].map(pkg => {
                                        const count = users.filter(u => (u.package_name || 'Starter') === pkg).length;
                                        const total = users.length || 1;
                                        const percent = Math.round((count / total) * 100);
                                        if (count === 0) return null;
                                        return (
                                            <div key={pkg} className="space-y-1.5">
                                                <div className="flex justify-between items-end">
                                                    {getBadgeForPackage(pkg)}
                                                    <span className="text-xs text-slate-400 font-mono">{count} users ({percent}%)</span>
                                                </div>
                                                <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                                    <div
                                                        className={`h-full ${pkg === 'Starter' ? 'bg-slate-500' : pkg === 'Pro' ? 'bg-[#DEFD40]' : pkg === 'Max' ? 'bg-[#C084FC]' : pkg === 'Private' ? 'bg-[#40E0D0]' : 'bg-[#FF6B00]'}`}
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold text-white tracking-tight">User Management</h2>
                            <button
                                className="admin-btn admin-btn-accent"
                                onClick={() => setShowCreateUser(!showCreateUser)}
                            >
                                {showCreateUser ? '✕ Close Form' : '+ Create User'}
                            </button>
                        </div>

                        {showCreateUser && (
                            <div className="admin-panel animate-in fade-in slide-in-from-top-4 mb-8">
                                <h3 className="admin-panel-title">Create New Access Code</h3>
                                <form onSubmit={handleCreateUser} className="flex flex-wrap gap-5 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Access Code</label>
                                        <div className="flex bg-[rgba(0,0,0,0.3)] border border-white/10 rounded-lg overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                                            <input type="text" value={newAccessCode} onChange={(e) => setNewAccessCode(e.target.value)} className="w-full bg-transparent text-white px-4 py-2.5 outline-none uppercase tracking-widest font-mono text-sm" placeholder="e.g. ALPHA1" required />
                                            <button type="button" onClick={generateAccessCode} className="px-4 bg-white/5 hover:bg-white/10 text-accent font-bold text-lg border-l border-white/10 transition-colors" title="Generate Random Code">🎲</button>
                                        </div>
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Art Credits</label>
                                        <input type="number" value={newArtCredits} onChange={(e) => setNewArtCredits(Number(e.target.value))} className="admin-input w-full py-2.5 font-mono" required />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Lore Credits</label>
                                        <input type="number" value={newLoreCredits} onChange={(e) => setNewLoreCredits(Number(e.target.value))} className="admin-input w-full py-2.5 font-mono" required />
                                    </div>
                                    <div className="flex-1 min-w-[260px]">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Subscription Duration (Empty=∞)</label>
                                        <div className="flex bg-[rgba(0,0,0,0.3)] border border-white/10 rounded-lg overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                                            <input
                                                type="number"
                                                value={newSubValue}
                                                onChange={(e) => setNewSubValue(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="flex-1 min-w-0 bg-transparent text-white px-4 py-2.5 outline-none font-mono text-sm"
                                                placeholder="∞"
                                            />
                                            <div className="flex shrink-0 bg-black/40 border-l border-white/10">
                                                {(['m', 'h', 'd', 'w'] as const).map(u => (
                                                    <button
                                                        key={u}
                                                        type="button"
                                                        onClick={() => setNewSubUnit(u)}
                                                        className={`px-3 py-2.5 text-xs font-bold transition-colors ${newSubUnit === u ? 'bg-accent text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {u.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-40 shrink-0">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Package Name</label>
                                        <select value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} className="admin-select w-full py-2.5">
                                            <option value="Starter">Starter</option>
                                            <option value="Pro">Pro</option>
                                            <option value="Max">Max</option>
                                            <option value="Private">Private</option>
                                            <option value="Cookball">Cookball</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="admin-btn admin-btn-accent py-2.5 px-8 text-black">Create User</button>
                                </form>
                            </div>
                        )}

                        <div className="admin-panel p-0 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center bg-white/[0.02]">
                                <div className="admin-search-wrapper">
                                    <span className="admin-search-icon">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search access code..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="admin-search-input"
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Filter:</span>
                                    <select className="admin-select" value={packageFilter} onChange={e => setPackageFilter(e.target.value)}>
                                        <option value="All">All Packages</option>
                                        <option value="Starter">Starter</option>
                                        <option value="Pro">Pro</option>
                                        <option value="Max">Max</option>
                                        <option value="Private">Private</option>
                                        <option value="Cookball">Cookball</option>
                                    </select>
                                </div>
                                <div className="ml-auto text-sm text-slate-400 font-mono">
                                    Showing <span className="text-white font-bold">{filteredUsers.length}</span> users
                                </div>
                            </div>

                            <div className="admin-table-container border-0 rounded-none max-h-[70vh] overflow-y-auto">
                                <table className="admin-table">
                                    <thead className="sticky top-0 z-20 shadow-md">
                                        <tr>
                                            <th className="pl-6 w-48">Access Code</th>
                                            <th className="w-24">Role</th>
                                            <th className="w-32">Package</th>
                                            <th className="text-center w-24">Active</th>
                                            <th className="text-center w-24">Art</th>
                                            <th className="text-center w-24">Scrape</th>
                                            <th className="text-center w-24">News Only</th>
                                            <th className="text-center w-32">Art Pts</th>
                                            <th className="text-center w-32">Lore Pts</th>
                                            <th className="text-center w-32">Sub</th>
                                            <th>Last Login</th>
                                            <th className="text-center pr-6">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.access_code} className="group">
                                                <td className="pl-6 font-mono text-white font-medium">
                                                    {editingCode?.old === user.access_code ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={editingCode.new}
                                                                onChange={(e) => setEditingCode({ ...editingCode, new: e.target.value.toUpperCase() })}
                                                                className="admin-input w-24 py-1 px-2 text-xs"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleSaveAccessCode(user.access_code)} className="text-green-400 hover:text-green-300 p-1">✓</button>
                                                            <button onClick={() => setEditingCode(null)} className="text-slate-400 hover:text-white p-1">✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>{user.access_code}</span>
                                                            <button onClick={() => setEditingCode({ old: user.access_code, new: user.access_code })} className="text-slate-500 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {user.is_admin ? <span className="badge badge-admin">ADMIN</span> : <span className="badge badge-starter">USER</span>}
                                                </td>
                                                <td>
                                                    <select
                                                        value={user.package_name || 'Starter'}
                                                        onChange={(e) => handleUpdatePackage(user.access_code, e.target.value)}
                                                        className={`admin-select py-1 px-2 text-xs w-full max-w-[120px] font-bold ${getBadgeClass(user.package_name || 'Starter').replace('badge', 'text')}`}
                                                    >
                                                        <option value="Starter">Starter</option>
                                                        <option value="Pro">Pro</option>
                                                        <option value="Max">Max</option>
                                                        <option value="Private">Private</option>
                                                        <option value="Cookball">Cookball</option>
                                                    </select>
                                                </td>
                                                <td className="text-center">
                                                    <label className="admin-toggle mx-auto">
                                                        <input type="checkbox" checked={user.is_active} onChange={() => handleToggle(user.access_code, 'is_active', user.is_active)} disabled={user.is_admin} />
                                                        <span className="admin-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td className="text-center">
                                                    <label className="admin-toggle mx-auto">
                                                        <input type="checkbox" checked={user.can_use_art} onChange={() => handleToggle(user.access_code, 'can_use_art', user.can_use_art)} disabled={user.is_admin} />
                                                        <span className="admin-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td className="text-center">
                                                    <label className="admin-toggle mx-auto">
                                                        <input type="checkbox" checked={user.can_use_scrape} onChange={() => handleToggle(user.access_code, 'can_use_scrape', user.can_use_scrape)} disabled={user.is_admin} />
                                                        <span className="admin-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td className="text-center">
                                                    <label className="admin-toggle mx-auto">
                                                        <input type="checkbox" checked={user.can_use_news_scrape || false} onChange={() => handleToggle(user.access_code, 'can_use_news_scrape', user.can_use_news_scrape || false)} disabled={user.is_admin} />
                                                        <span className="admin-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td className="text-center">
                                                    {user.is_admin ? (
                                                        <span className="font-mono text-slate-500 font-bold">∞</span>
                                                    ) : editingCredits?.access_code === user.access_code && editingCredits.type === 'art' ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={editingCredits.value}
                                                                onChange={(e) => setEditingCredits({ ...editingCredits, value: e.target.value })}
                                                                className="admin-input w-16 py-1 px-2 text-xs text-center font-mono"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleSaveCredits(user.access_code, 'art_credits')} className="text-green-400 hover:text-green-300">✓</button>
                                                            <button onClick={() => setEditingCredits(null)} className="text-slate-400 hover:text-white">✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center bg-black/40 border border-white/10 rounded overflow-hidden">
                                                            <button onClick={() => handleUpdateCredits(user.access_code, 'art_credits', 'sub')} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 font-bold transition-colors">-</button>
                                                            <span
                                                                onClick={() => setEditingCredits({ access_code: user.access_code, type: 'art', value: user.art_credits.toString() })}
                                                                className="w-10 text-center font-mono text-sm cursor-pointer hover:text-accent font-bold"
                                                                title="Click to edit"
                                                            >
                                                                {user.art_credits}
                                                            </span>
                                                            <button onClick={() => handleUpdateCredits(user.access_code, 'art_credits', 'add')} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 font-bold transition-colors">+</button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {user.is_admin ? (
                                                        <span className="font-mono text-slate-500 font-bold">∞</span>
                                                    ) : editingCredits?.access_code === user.access_code && editingCredits.type === 'lore' ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={editingCredits.value}
                                                                onChange={(e) => setEditingCredits({ ...editingCredits, value: e.target.value })}
                                                                className="admin-input w-16 py-1 px-2 text-xs text-center font-mono"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleSaveCredits(user.access_code, 'lore_credits')} className="text-green-400 hover:text-green-300">✓</button>
                                                            <button onClick={() => setEditingCredits(null)} className="text-slate-400 hover:text-white">✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center bg-black/40 border border-white/10 rounded overflow-hidden">
                                                            <button onClick={() => handleUpdateCredits(user.access_code, 'lore_credits', 'sub')} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 font-bold transition-colors">-</button>
                                                            <span
                                                                onClick={() => setEditingCredits({ access_code: user.access_code, type: 'lore', value: user.lore_credits.toString() })}
                                                                className="w-10 text-center font-mono text-sm cursor-pointer hover:text-accent font-bold"
                                                                title="Click to edit"
                                                            >
                                                                {user.lore_credits}
                                                            </span>
                                                            <button onClick={() => handleUpdateCredits(user.access_code, 'lore_credits', 'add')} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 font-bold transition-colors">+</button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {user.is_admin ? (
                                                        <span className="font-mono text-slate-500 font-bold">∞</span>
                                                    ) : editingSub?.access_code === user.access_code ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center bg-black/40 border border-white/10 rounded overflow-hidden max-w-[100px]">
                                                                <input
                                                                    type="number"
                                                                    value={editingSub.value}
                                                                    onChange={(e) => setEditingSub({ ...editingSub, value: e.target.value === '' ? '' : Number(e.target.value) })}
                                                                    className="w-12 bg-transparent text-white px-2 py-1 text-xs outline-none text-center font-mono"
                                                                    placeholder="∞"
                                                                    autoFocus
                                                                />
                                                                <select
                                                                    value={editingSub.unit}
                                                                    onChange={(e) => setEditingSub({ ...editingSub, unit: e.target.value as any })}
                                                                    className="bg-transparent text-slate-400 px-1 py-1 outline-none text-[10px] uppercase font-bold border-l border-white/10 appearance-none text-center cursor-pointer"
                                                                >
                                                                    <option value="m">m</option>
                                                                    <option value="h">h</option>
                                                                    <option value="d">d</option>
                                                                    <option value="w">w</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleSaveSub(user.access_code)} className="text-green-400 hover:text-green-300 text-[10px] font-bold tracking-widest uppercase">Save</button>
                                                                <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-white text-[10px] font-bold tracking-widest uppercase">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center group/sub relative cursor-pointer" onClick={() => {
                                                            const d = user.subscription_days;
                                                            let v: number | '' = '';
                                                            let u: 'm' | 'h' | 'd' | 'w' = 'd';
                                                            if (d) {
                                                                if (d >= 7) { v = d / 7; u = 'w'; }
                                                                else if (d >= 1) { v = d; u = 'd'; }
                                                                else if (d * 24 >= 1) { v = d * 24; u = 'h'; }
                                                                else { v = d * 24 * 60; u = 'm'; }
                                                            }
                                                            setEditingSub({ access_code: user.access_code, value: v, unit: u });
                                                        }} title="Click to edit">
                                                            <div className="font-mono font-bold text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5 group-hover/sub:border-white/20 transition-colors">
                                                                {formatSubscription(user.subscription_days)}
                                                            </div>

                                                            {user.subscription_start && !isSubscriptionExpired(user) && (
                                                                <div className="text-[9px] text-[#4ade80] font-bold mt-1 uppercase tracking-wider">
                                                                    {getRemainingTimeStr(user)} left
                                                                </div>
                                                            )}
                                                            {isSubscriptionExpired(user) && (
                                                                <div className="text-[9px] text-[#f87171] font-bold mt-1 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded">
                                                                    Expired
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-xs text-slate-400 font-mono">
                                                    {user.last_login ? new Date(user.last_login).toLocaleString() : <span className="text-slate-600">Never</span>}
                                                </td>
                                                <td className="text-center pr-6">
                                                    {!user.is_admin && (
                                                        <button
                                                            onClick={() => setUserToDelete(user.access_code)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto hover:bg-red-500 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                                            title="Delete User"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={12} className="py-12 text-center text-slate-500">
                                                    No users found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'discounts' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold text-white tracking-tight">Discount Codes</h2>
                            <button
                                className="admin-btn admin-btn-accent"
                                onClick={() => setShowCreateDiscount(!showCreateDiscount)}
                            >
                                {showCreateDiscount ? '✕ Close Form' : '+ Create Code'}
                            </button>
                        </div>

                        {showCreateDiscount && (
                            <div className="admin-panel animate-in fade-in slide-in-from-top-4 mb-8">
                                <h3 className="admin-panel-title">Create Discount Code</h3>
                                <form onSubmit={handleCreateDiscountCode} className="flex flex-wrap gap-5 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Code</label>
                                        <input type="text" value={newDiscountCode} onChange={(e) => setNewDiscountCode(e.target.value)} className="admin-input w-full py-2.5 font-mono uppercase tracking-widest text-sm" placeholder="e.g. EARLYBIRD" required />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Discount %</label>
                                        <div className="relative">
                                            <input type="number" min="0" max="100" value={newDiscountPercentage} onChange={(e) => setNewDiscountPercentage(Number(e.target.value))} className="admin-input w-full py-2.5 font-mono pr-8" required />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="w-[260px]">
                                        <label className="block text-xs font-semibold text-slate-400 mb-2">Duration Limit</label>
                                        <div className="flex bg-[rgba(0,0,0,0.3)] border border-white/10 rounded-lg overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Unlimited"
                                                value={newDiscountDurationValue}
                                                onChange={(e) => setNewDiscountDurationValue(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="flex-1 min-w-0 bg-transparent text-white px-4 py-2.5 outline-none font-mono text-sm placeholder:text-slate-600"
                                            />
                                            <select
                                                value={newDiscountDurationUnit}
                                                onChange={(e) => setNewDiscountDurationUnit(e.target.value as any)}
                                                className="bg-black/40 text-slate-400 px-3 py-2.5 outline-none font-bold text-xs uppercase border-l border-white/10 cursor-pointer appearance-none text-center min-w-[60px]"
                                            >
                                                <option value="m">Min</option>
                                                <option value="h">Hour</option>
                                                <option value="d">Day</option>
                                                <option value="w">Week</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="admin-btn admin-btn-accent py-2.5 px-8 text-black">Create Code</button>
                                </form>
                            </div>
                        )}

                        <div className="admin-panel p-0 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center bg-white/[0.02]">
                                <h3 className="text-white font-semibold">Active Codes</h3>
                                <div className="ml-auto badge badge-active">
                                    {discountCodes.filter(dc => dc.is_active && (!dc.expires_at || new Date(dc.expires_at) > new Date())).length} Active
                                </div>
                            </div>

                            <div className="admin-table-container border-0 rounded-none">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th className="pl-6 w-48">Code</th>
                                            <th className="w-32">Discount</th>
                                            <th className="text-center w-24">Active</th>
                                            <th>Expires At</th>
                                            <th>Created At</th>
                                            <th className="text-center pr-6 w-24">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {discountCodes.map(dc => {
                                            const isExpired = dc.expires_at ? new Date(dc.expires_at) < new Date() : false;
                                            return (
                                                <tr key={dc.id} className={isExpired ? 'opacity-50' : ''}>
                                                    <td className="pl-6 font-mono text-accent font-bold tracking-widest">
                                                        {dc.code}
                                                        {isExpired && <span className="ml-3 badge badge-expired">Expired</span>}
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-bold text-lg">{dc.percentage}%</span>
                                                            <span className="text-slate-500 text-xs font-semibold uppercase">Off</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <label className="admin-toggle mx-auto">
                                                            <input type="checkbox" checked={dc.is_active} onChange={() => handleToggleDiscount(dc.id, dc.is_active)} />
                                                            <span className="admin-toggle-slider"></span>
                                                        </label>
                                                    </td>
                                                    <td className="text-slate-400 font-mono text-xs">
                                                        {dc.expires_at ? new Date(dc.expires_at).toLocaleString() : <span className="text-slate-600 font-sans italic">— Unlimited —</span>}
                                                    </td>
                                                    <td className="text-slate-500 font-mono text-xs">
                                                        {new Date(dc.created_at || '').toLocaleDateString()}
                                                    </td>
                                                    <td className="text-center pr-6">
                                                        <button
                                                            onClick={() => setDiscountToDelete(dc.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto hover:bg-red-500 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                                            title="Delete Code"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {discountCodes.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-500">
                                                    No discount codes created yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {userToDelete && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal-content">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border-2 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            🗑️
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 text-center">Delete User?</h3>
                        <p className="text-slate-400 mb-8 text-center text-sm leading-relaxed">
                            Are you sure you want to completely delete <strong className="text-accent bg-accent/10 px-1 py-0.5 rounded font-mono">{userToDelete}</strong>?<br />This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setUserToDelete(null)}
                                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {discountToDelete && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal-content">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border-2 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            🏷️
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 text-center">Delete Code?</h3>
                        <p className="text-slate-400 mb-8 text-center text-sm leading-relaxed">
                            Are you sure you want to completely delete this discount code?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDiscountToDelete(null)}
                                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteDiscountCode}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            >
                                Delete Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
