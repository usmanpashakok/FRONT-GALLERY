"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    const verifyAndFetch = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('https://backend-api-gallery.onrender.com/admin/users', {
                headers: { 'x-admin-secret': secret }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                setIsAuthenticated(true);
            } else {
                setError('Invalid Secret or Unauthorized');
            }
        } catch (e) {
            setError('Failed to connect to backend');
        } finally {
            setLoading(false);
        }
    };

    const updatePlan = async (uuid: string, newPlan: string) => {
        if (!confirm(`Are you sure you want to upgrade this user to ${newPlan}?`)) return;

        try {
            const res = await fetch('https://backend-api-gallery.onrender.com/admin/update-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secret
                },
                body: JSON.stringify({ uuid, newPlan })
            });

            if (res.ok) {
                alert('Plan updated successfully!');
                // Update local state
                setUsers(users.map(u => u.uuid === uuid ? { ...u, plan: newPlan } : u));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update plan');
            }
        } catch (e) {
            alert('Error updating plan');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="bg-zinc-900 p-8 rounded-xl border border-white/10 w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
                    {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}
                    <input
                        type="password"
                        placeholder="Enter Admin Secret"
                        className="w-full bg-black border border-zinc-700 rounded p-3 mb-4 text-white"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                    />
                    <button
                        onClick={verifyAndFetch}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded p-3 font-bold transition-colors"
                    >
                        {loading ? 'Verifying...' : 'Access Dashboard'}
                    </button>
                    <p className="fixed bottom-4 right-4 text-xs text-zinc-600">Hint: h4k3r-admin-2024</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="bg-purple-600 w-3 h-8 rounded-full"></span>
                Admin Dashboard
            </h1>

            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left bg-zinc-900/50">
                    <thead className="bg-white/5 text-white/50 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4">Name / Email</th>
                            <th className="p-4">UUID</th>
                            <th className="p-4">Last Login</th>
                            <th className="p-4">Current Plan</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user.uuid} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-white">{user.name}</div>
                                    <div className="text-sm text-white/50">{user.email}</div>
                                </td>
                                <td className="p-4 font-mono text-xs text-white/40">{user.uuid}</td>
                                <td className="p-4 text-sm text-white/60">
                                    {new Date(user.last_login).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.plan === 'premium' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' :
                                            user.plan === 'standard' ? 'bg-blue-600 text-white' :
                                                'bg-zinc-700 text-zinc-300'
                                        }`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updatePlan(user.uuid, 'basic')}
                                            disabled={user.plan === 'basic'}
                                            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs disabled:opacity-30"
                                        >
                                            Basic
                                        </button>
                                        <button
                                            onClick={() => updatePlan(user.uuid, 'standard')}
                                            disabled={user.plan === 'standard'}
                                            className="px-3 py-1 rounded bg-blue-900 hover:bg-blue-800 text-blue-200 text-xs disabled:opacity-30"
                                        >
                                            Standard
                                        </button>
                                        <button
                                            onClick={() => updatePlan(user.uuid, 'premium')}
                                            disabled={user.plan === 'premium'}
                                            className="px-3 py-1 rounded bg-yellow-900/50 hover:bg-yellow-800 text-yellow-200 text-xs disabled:opacity-30 border border-yellow-500/20"
                                        >
                                            Premium
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
