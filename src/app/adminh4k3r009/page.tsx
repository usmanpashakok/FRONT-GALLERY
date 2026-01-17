"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
    email: string;
    name?: string;
    uuid?: string;
    plan: 'basic' | 'standard' | 'premium';
    planExpiresAt?: string | null;
    created_at?: string;
    image?: string;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [adminSecret, setAdminSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Selected user for editing
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPlan, setNewPlan] = useState<'basic' | 'standard' | 'premium'>('basic');
    const [expiryDate, setExpiryDate] = useState('');

    const BACKEND_URL = 'https://backend-api-gallery.onrender.com';

    const handleLogin = async () => {
        if (!adminSecret) {
            setError('Admin secret required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`, {
                headers: { 'x-admin-secret': adminSecret }
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                setIsAuthenticated(true);
                localStorage.setItem('adminSecret', adminSecret);
            } else {
                setError('Invalid admin secret');
            }
        } catch (e) {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('adminSecret');
        if (saved) {
            setAdminSecret(saved);
        }
    }, []);

    const handleSearch = async () => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users/search?email=${encodeURIComponent(searchQuery)}`, {
                headers: { 'x-admin-secret': adminSecret }
            });
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (e) {
            setError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetPlan = async () => {
        if (!selectedUser) return;

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`${BACKEND_URL}/admin/set-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': adminSecret
                },
                body: JSON.stringify({
                    email: selectedUser.email,
                    plan: newPlan,
                    expiresAt: expiryDate || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSuccess(`Plan updated for ${selectedUser.email}`);
                setSelectedUser(null);

                // Refresh users list
                const usersRes = await fetch(`${BACKEND_URL}/admin/users`, {
                    headers: { 'x-admin-secret': adminSecret }
                });
                if (usersRes.ok) {
                    setUsers(await usersRes.json());
                }
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to update plan');
            }
        } catch (e) {
            setError('Failed to update plan');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewPlan(user.plan || 'basic');
        setExpiryDate(user.planExpiresAt ? new Date(user.planExpiresAt).toISOString().split('T')[0] : '');
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'premium': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
            case 'standard': return 'bg-gradient-to-r from-purple-500 to-blue-500';
            default: return 'bg-white/20';
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h1 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600">🛡️ Admin Panel (H4K3R)</h1>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/60 mb-2">Admin Secret</label>
                            <input
                                type="password"
                                value={adminSecret}
                                onChange={(e) => setAdminSecret(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                placeholder="Enter admin secret..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {isLoading ? 'Connecting...' : 'Login'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-600">
                        🛡️ Admin Panel (H4K3R)
                    </h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('adminSecret');
                            setIsAuthenticated(false);
                            setAdminSecret('');
                        }}
                        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm"
                    >
                        Logout
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm animate-fadeIn">
                        {error}
                        <button onClick={() => setError('')} className="float-right">×</button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm animate-fadeIn">
                        {success}
                        <button onClick={() => setSuccess('')} className="float-right">×</button>
                    </div>
                )}

                {/* Search */}
                <div className="mb-6 flex gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by email..."
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-3 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        Search
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-2xl font-bold">{users.length}</div>
                        <div className="text-sm text-white/60">Total Users</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white/60">{users.filter(u => u.plan === 'basic').length}</div>
                        <div className="text-sm text-white/60">Basic</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-4">
                        <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.plan === 'standard').length}</div>
                        <div className="text-sm text-purple-400/60">Standard</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                        <div className="text-2xl font-bold text-yellow-400">{users.filter(u => u.plan === 'premium').length}</div>
                        <div className="text-sm text-yellow-400/60">Premium</div>
                    </div>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden space-y-4">
                        {(searchResults.length > 0 ? searchResults : users).map((user, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-semibold break-all">{user.email}</div>
                                        <div className="text-white/60 text-sm">{user.name || 'No Name'}</div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${getPlanBadgeColor(user.plan || 'basic')}`}>
                                        {user.plan || 'basic'}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg">
                                        {user.image?.includes('google') ? (
                                            <>
                                                <img src={user.image} className="w-4 h-4 rounded-full" alt="G" />
                                                <span className="text-white/80">Google</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-lg leading-none">📧</span>
                                                <span className="text-white/60">Email</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg text-white/60">
                                        📅 {user.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : 'Lifetime'}
                                    </div>
                                </div>

                                <button
                                    onClick={() => openEditModal(user)}
                                    className="w-full py-2.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors font-medium text-sm"
                                >
                                    Edit Plan
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Desktop View (Table) */}
                    <div className="hidden md:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Email</th>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Method</th>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Name</th>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Plan</th>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Expires</th>
                                        <th className="text-left p-4 text-sm font-medium text-white/60">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(searchResults.length > 0 ? searchResults : users).map((user, idx) => (
                                        <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                                            <td className="p-4 text-sm">{user.email}</td>
                                            <td className="p-4">
                                                {user.image?.includes('google') ? (
                                                    <span className="flex items-center gap-2 text-xs bg-white/10 px-2 py-1 rounded-full w-fit">
                                                        <img src={user.image} className="w-4 h-4 rounded-full" alt="G" /> Google
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full w-fit">
                                                        📧 Email
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-white/60">{user.name || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getPlanBadgeColor(user.plan || 'basic')}`}>
                                                    {user.plan || 'basic'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-white/60">
                                                {user.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    Edit Plan
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Plan Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Edit Plan</h2>
                        <p className="text-sm text-white/60 mb-6">{selectedUser.email}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Plan</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['basic', 'standard', 'premium'] as const).map(plan => (
                                        <button
                                            key={plan}
                                            onClick={() => setNewPlan(plan)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${newPlan === plan
                                                ? getPlanBadgeColor(plan) + ' scale-105'
                                                : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                        >
                                            {plan}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newPlan !== 'basic' && (
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Expiry Date (optional)</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                                    />
                                    <p className="text-xs text-white/40 mt-1">Leave empty for no expiry</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 py-3 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetPlan}
                                disabled={isLoading}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
