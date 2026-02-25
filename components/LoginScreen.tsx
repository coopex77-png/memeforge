import React, { useState } from 'react';
import { supabase } from '../supabase';
import { DatabaseUser } from '../types';

interface LoginScreenProps {
    onLogin: (user: DatabaseUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const codeToUse = accessCode.trim();

        if (!codeToUse) {
            setError('Please enter an access code.');
            return;
        }

        setLoading(true);
        try {
            // Use ilike for case-insensitive matching instead of eq
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .ilike('access_code', codeToUse)
                .single();

            if (fetchError || !user) {
                setError('Invalid Access Code.');
                setLoading(false);
                return;
            }

            if (!user.is_active) {
                setError('Your account has been suspended or is inactive.');
                setLoading(false);
                return;
            }

            // Check subscription initialization
            let updatedUser = { ...user };
            const updates: Partial<DatabaseUser> = { last_login: new Date().toISOString() };

            if (user.subscription_days && !user.subscription_start) {
                const now = new Date().toISOString();
                updates.subscription_start = now;
                updatedUser.subscription_start = now;
            }

            // Update user record
            await supabase
                .from('users')
                .update(updates)
                .eq('access_code', user.access_code);

            onLogin(updatedUser as DatabaseUser);
        } catch (err) {
            setError('An error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-slate-300 font-sans selection:bg-accent/30 selection:text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">

                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none"></div>

                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/50 mb-2 relative z-10 text-center">
                    MemeStudio Beta
                </h1>
                <p className="text-slate-400 text-center mb-8 relative z-10 text-sm">
                    Please enter your access code to continue.
                </p>

                <form onSubmit={handleLogin} className="relative z-10 space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="Access Code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-white p-4 rounded-lg focus:outline-none focus:border-accent text-center tracking-widest text-lg transition-colors placeholder:text-slate-600 focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-accent/80 text-black font-bold p-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : "ENTER"}
                    </button>
                </form>
            </div>
        </div>
    );
};
