import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DatabaseUser } from '../types';

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
    const [newPackageName, setNewPackageName] = useState<string>('Free');
    const [editingCode, setEditingCode] = useState<{ old: string; new: string } | null>(null);
    const [editingSub, setEditingSub] = useState<{ access_code: string; value: number | ''; unit: 'm' | 'h' | 'd' | 'w' } | null>(null);
    const [editingCredits, setEditingCredits] = useState<{ access_code: string; type: 'art' | 'lore'; value: string } | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();

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
                setNewPackageName('Free');
                alert('User created successfully.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (accessCode: string, field: keyof DatabaseUser, currentValue: boolean) => {
        await supabase.from('users').update({ [field]: !currentValue }).eq('access_code', accessCode);
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

    return (
        <div className="min-h-screen bg-black text-slate-300 font-sans p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-accent">Admin Dashboard</h1>
                    <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors">
                        Back to App
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Create New Access Code</h2>
                    <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-slate-400 mb-1">Access Code</label>
                            <div className="flex">
                                <input type="text" value={newAccessCode} onChange={(e) => setNewAccessCode(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded-l focus:outline-none focus:border-accent uppercase tracking-widest" placeholder="e.g. ALPHA1" required />
                                <button type="button" onClick={generateAccessCode} className="px-3 bg-slate-800 hover:bg-slate-700 text-accent rounded-r font-bold text-xs" title="Generate Random Code">🎲</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Initial Art Credits</label>
                            <input type="number" value={newArtCredits} onChange={(e) => setNewArtCredits(Number(e.target.value))} className="w-24 bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:outline-none focus:border-accent" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Initial Lore Credits</label>
                            <input type="number" value={newLoreCredits} onChange={(e) => setNewLoreCredits(Number(e.target.value))} className="w-24 bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:outline-none focus:border-accent" required />
                        </div>
                        <div className="flex-1 min-w-[260px]">
                            <label className="block text-xs text-slate-400 mb-1">Subscription Duration (Empty=∞)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={newSubValue}
                                    onChange={(e) => setNewSubValue(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="flex-1 min-w-0 bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:outline-none focus:border-accent"
                                    placeholder="∞"
                                />
                                <div className="flex shrink-0 bg-slate-950 border border-slate-700 rounded overflow-hidden">
                                    {(['m', 'h', 'd', 'w'] as const).map(u => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => setNewSubUnit(u)}
                                            className={`px-3 py-1 text-xs font-bold transition-colors ${newSubUnit === u ? 'bg-accent text-black' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {u.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="w-36 shrink-0">
                            <label className="block text-xs text-slate-400 mb-1">Package Name</label>
                            <select value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:outline-none focus:border-accent">
                                <option value="Free">Free</option>
                                <option value="Silver">Silver</option>
                                <option value="Gold">Gold</option>
                                <option value="Premium">Premium</option>
                                <option value="Cookball">Cookball</option>
                            </select>
                        </div>
                        <button type="submit" className="px-6 py-2 bg-accent hover:bg-accent/80 text-black font-bold rounded shadow-lg">Create</button>
                    </form>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl overflow-x-auto">
                    <h2 className="text-xl font-bold text-white mb-4">User Management</h2>
                    {loading ? (
                        <div className="text-slate-500 py-8 text-center animate-pulse">Loading users...</div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-500">
                                    <th className="py-3 px-2 font-medium">Access Code</th>
                                    <th className="py-3 px-2 font-medium">Role</th>
                                    <th className="py-3 px-2 font-medium">Package</th>
                                    <th className="py-3 px-2 font-medium text-center">Active</th>
                                    <th className="py-3 px-2 font-medium text-center">Art Access</th>
                                    <th className="py-3 px-2 font-medium text-center">Scrape Access</th>
                                    <th className="py-3 px-2 font-medium text-center">Art Credits</th>
                                    <th className="py-3 px-2 font-medium text-center">Lore Credits</th>
                                    <th className="py-3 px-2 font-medium text-center">Subscription</th>
                                    <th className="py-3 px-2 font-medium">Last Login</th>
                                    <th className="py-3 px-2 font-medium text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.access_code} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-2 font-mono text-accent">
                                            {editingCode?.old === user.access_code ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingCode.new}
                                                        onChange={(e) => setEditingCode({ ...editingCode, new: e.target.value.toUpperCase() })}
                                                        className="w-24 bg-slate-950 text-white px-2 py-1 border border-slate-700 rounded text-xs outline-none focus:border-accent"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveAccessCode(user.access_code)} className="text-green-500 font-bold hover:text-green-400">✓</button>
                                                    <button onClick={() => setEditingCode(null)} className="text-slate-500 hover:text-white">✕</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <span>{user.access_code}</span>
                                                    <button onClick={() => setEditingCode({ old: user.access_code, new: user.access_code })} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Access Code">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            {user.is_admin ? <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">ADMIN</span> : <span className="text-slate-500">USER</span>}
                                        </td>
                                        <td className="py-3 px-2">
                                            <select
                                                value={user.package_name || 'Free'}
                                                onChange={(e) => handleUpdatePackage(user.access_code, e.target.value)}
                                                className={`text-xs p-1 rounded bg-slate-950 border outline-none ${user.package_name === 'Cookball' ? 'text-cyan-400 border-cyan-500/30' : user.package_name === 'Premium' ? 'text-purple-400 border-purple-500/30' : user.package_name === 'Gold' ? 'text-yellow-400 border-yellow-500/30' : user.package_name === 'Silver' ? 'text-slate-300 border-slate-300/30' : 'text-slate-500 border-slate-700'} focus:border-accent`}
                                            >
                                                <option value="Free">Free</option>
                                                <option value="Silver">Silver</option>
                                                <option value="Gold">Gold</option>
                                                <option value="Premium">Premium</option>
                                                <option value="Cookball">Cookball</option>
                                            </select>
                                        </td>
                                        <td className="py-3 px-2 text-center text-lg">
                                            <button onClick={() => handleToggle(user.access_code, 'is_active', user.is_active)} className="hover:scale-110 transition-transform disabled:opacity-50" disabled={user.is_admin}>
                                                {user.is_active ? '🟢' : '🔴'}
                                            </button>
                                        </td>

                                        <td className="py-3 px-2 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={user.can_use_art} onChange={() => handleToggle(user.access_code, 'can_use_art', user.can_use_art)} disabled={user.is_admin} />
                                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent disabled:opacity-50"></div>
                                            </label>
                                        </td>

                                        <td className="py-3 px-2 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={user.can_use_scrape} onChange={() => handleToggle(user.access_code, 'can_use_scrape', user.can_use_scrape)} disabled={user.is_admin} />
                                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent disabled:opacity-50"></div>
                                            </label>
                                        </td>

                                        <td className="py-3 px-2 text-center">
                                            {user.is_admin ? (
                                                <span className="font-bold text-xl text-slate-500">∞</span>
                                            ) : editingCredits?.access_code === user.access_code && editingCredits.type === 'art' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={editingCredits.value}
                                                        onChange={(e) => setEditingCredits({ ...editingCredits, value: e.target.value })}
                                                        className="w-16 bg-slate-950 text-white px-2 py-1 border border-slate-700 rounded text-xs outline-none focus:border-accent text-center"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveCredits(user.access_code, 'art_credits')} className="text-green-500 font-bold hover:text-green-400">✓</button>
                                                    <button onClick={() => setEditingCredits(null)} className="text-slate-500 hover:text-white">✕</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                                                    <button onClick={() => handleUpdateCredits(user.access_code, 'art_credits', 'sub')} className="text-slate-500 hover:text-white hover:bg-slate-800 px-2.5 py-1 font-bold transition-colors">-</button>
                                                    <span
                                                        onClick={() => setEditingCredits({ access_code: user.access_code, type: 'art', value: user.art_credits.toString() })}
                                                        className="font-bold w-12 text-center cursor-pointer hover:text-accent transition-colors"
                                                        title="Click to edit"
                                                    >
                                                        {user.art_credits}
                                                    </span>
                                                    <button onClick={() => handleUpdateCredits(user.access_code, 'art_credits', 'add')} className="text-slate-500 hover:text-white hover:bg-slate-800 px-2.5 py-1 font-bold transition-colors">+</button>
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3 px-2 text-center">
                                            {user.is_admin ? (
                                                <span className="font-bold text-xl text-slate-500">∞</span>
                                            ) : editingCredits?.access_code === user.access_code && editingCredits.type === 'lore' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={editingCredits.value}
                                                        onChange={(e) => setEditingCredits({ ...editingCredits, value: e.target.value })}
                                                        className="w-16 bg-slate-950 text-white px-2 py-1 border border-slate-700 rounded text-xs outline-none focus:border-accent text-center"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveCredits(user.access_code, 'lore_credits')} className="text-green-500 font-bold hover:text-green-400">✓</button>
                                                    <button onClick={() => setEditingCredits(null)} className="text-slate-500 hover:text-white">✕</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                                                    <button onClick={() => handleUpdateCredits(user.access_code, 'lore_credits', 'sub')} className="text-slate-500 hover:text-white hover:bg-slate-800 px-2.5 py-1 font-bold transition-colors">-</button>
                                                    <span
                                                        onClick={() => setEditingCredits({ access_code: user.access_code, type: 'lore', value: user.lore_credits.toString() })}
                                                        className="font-bold w-12 text-center cursor-pointer hover:text-accent transition-colors"
                                                        title="Click to edit"
                                                    >
                                                        {user.lore_credits}
                                                    </span>
                                                    <button onClick={() => handleUpdateCredits(user.access_code, 'lore_credits', 'add')} className="text-slate-500 hover:text-white hover:bg-slate-800 px-2.5 py-1 font-bold transition-colors">+</button>
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3 px-2 text-center">
                                            {user.is_admin ? (
                                                <span className="font-bold text-xl text-slate-500">∞</span>
                                            ) : editingSub?.access_code === user.access_code ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="number"
                                                            value={editingSub.value}
                                                            onChange={(e) => setEditingSub({ ...editingSub, value: e.target.value === '' ? '' : Number(e.target.value) })}
                                                            className="w-16 bg-slate-950 text-white px-2 py-1 border border-slate-700 rounded text-xs outline-none focus:border-accent text-center"
                                                            placeholder="∞"
                                                            autoFocus
                                                        />
                                                        <div className="flex bg-black border border-slate-700 rounded overflow-hidden">
                                                            {(['m', 'h', 'd', 'w'] as const).map(u => (
                                                                <button
                                                                    key={u}
                                                                    type="button"
                                                                    onClick={() => setEditingSub({ ...editingSub, unit: u })}
                                                                    className={`px-1.5 py-1 text-[10px] font-bold ${editingSub.unit === u ? 'bg-accent text-black' : 'text-slate-500'}`}
                                                                >
                                                                    {u}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleSaveSub(user.access_code)} className="text-green-500 font-bold hover:text-green-400 text-xs">Save</button>
                                                        <button onClick={() => setEditingSub(null)} className="text-slate-500 hover:text-white text-xs">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 group/sub">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold whitespace-nowrap">
                                                            {formatSubscription(user.subscription_days)}
                                                        </span>
                                                        {user.subscription_start && !isSubscriptionExpired(user) && (
                                                            <span className="text-[10px] text-green-400 font-bold mt-1">
                                                                {getRemainingTimeStr(user)} left
                                                            </span>
                                                        )}
                                                        {isSubscriptionExpired(user) && (
                                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded mt-1">Expired</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
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
                                                        }}
                                                        className="text-slate-500 hover:text-white opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                                        title="Edit Subscription"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3 px-2 text-slate-500 text-xs">
                                            {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="py-3 px-2 text-center text-lg">
                                            {!user.is_admin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setUserToDelete(user.access_code);
                                                    }}
                                                    className="text-red-500 hover:text-red-400 hover:scale-125 transition-transform"
                                                    title="Delete User"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-500/50 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                🗑️
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete User?</h3>
                            <p className="text-slate-400 mb-6 text-sm">
                                Are you sure you want to completely delete <strong className="text-accent">{userToDelete}</strong>? This action cannot be undone and will permanently remove this user from the database.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
