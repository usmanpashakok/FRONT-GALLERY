"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";

interface User {
    email: string;
    name?: string;
    uuid?: string;
    plan: 'basic' | 'standard' | 'premium';
    planExpiresAt?: string | null;
    created_at?: string;
    image?: string;
    provider?: string;
}

interface R2File {
    id: string;
    url: string;
    created_at: string;
    resource_type: 'image' | 'video';
    size?: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'media'>('users');

    // Selected user for editing
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPlan, setNewPlan] = useState<'basic' | 'standard' | 'premium'>('basic');
    const [expiryDate, setExpiryDate] = useState('');

    // R2 Media Browser State
    const [r2Files, setR2Files] = useState<R2File[]>([]);
    const [r2Loading, setR2Loading] = useState(false);
    const [r2UuidFilter, setR2UuidFilter] = useState('');
    const [mediaPreview, setMediaPreview] = useState<R2File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');

    const BACKEND_URL = 'https://backend-api-gallery.onrender.com';
    const R2_CACHE_KEY = 'admin_r2_files_cache';
    const R2_CACHE_TS_KEY = 'admin_r2_cache_ts';

    // Check if session email matches admin email
    useEffect(() => {
        if (status === 'authenticated' && session?.user?.email) {
            checkAdminAccess(session.user.email);
        } else if (status === 'unauthenticated') {
            setIsAuthorized(false);
        }
    }, [session, status]);

    const checkAdminAccess = async (email: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.authorized) {
                    setIsAuthorized(true);
                    localStorage.setItem('admin_authorized', 'true');
                    localStorage.setItem('admin_email', email);
                    fetchUsers(email);
                } else {
                    setIsAuthorized(false);
                    setError('Your Google account is not authorized for admin access.');
                }
            }
        } catch {
            const cached = localStorage.getItem('admin_authorized');
            const cachedEmail = localStorage.getItem('admin_email');
            if (cached === 'true' && cachedEmail === email) {
                setIsAuthorized(true);
                fetchUsers(email);
            } else {
                setError('Failed to verify admin access');
            }
        }
    };

    const fetchUsers = async (email: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`, {
                headers: { 'x-admin-email': email }
            });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch {
            setError('Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery || !session?.user?.email) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users/search?email=${encodeURIComponent(searchQuery)}`, {
                headers: { 'x-admin-email': session.user.email }
            });
            if (res.ok) setSearchResults(await res.json());
        } catch {
            setError('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetPlan = async () => {
        if (!selectedUser || !session?.user?.email) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`${BACKEND_URL}/admin/set-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-email': session.user.email
                },
                body: JSON.stringify({
                    email: selectedUser.email,
                    plan: newPlan,
                    expiresAt: expiryDate || null
                })
            });
            if (res.ok) {
                setSuccess(`Plan updated for ${selectedUser.email}`);
                setSelectedUser(null);
                fetchUsers(session.user.email);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to update plan');
            }
        } catch {
            setError('Failed to update plan');
        } finally {
            setIsLoading(false);
        }
    };

    // R2 Media Functions — with localStorage cache
    const fetchR2Files = useCallback(async (useCache = false) => {
        if (!session?.user?.email) return;

        // Try loading from cache first for instant display
        if (useCache) {
            try {
                const cached = localStorage.getItem(R2_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setR2Files(parsed);
                }
            } catch { /* ignore */ }
        }

        setR2Loading(true);
        try {
            const url = r2UuidFilter
                ? `${BACKEND_URL}/admin/r2-files?uuid=${encodeURIComponent(r2UuidFilter)}`
                : `${BACKEND_URL}/admin/r2-files`;
            const res = await fetch(url, {
                headers: { 'x-admin-email': session.user.email }
            });
            if (res.ok) {
                const data = await res.json();
                setR2Files(data);
                // Cache to localStorage
                try {
                    localStorage.setItem(R2_CACHE_KEY, JSON.stringify(data));
                    localStorage.setItem(R2_CACHE_TS_KEY, Date.now().toString());
                } catch { /* storage full, ignore */ }
            }
        } catch {
            setError('Failed to fetch R2 files');
        } finally {
            setR2Loading(false);
        }
    }, [session, r2UuidFilter]);

    const deleteR2Files = async (fileIds: string[]) => {
        if (!session?.user?.email || fileIds.length === 0) return;
        setR2Loading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/admin/r2-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-email': session.user.email
                },
                body: JSON.stringify({ ids: fileIds })
            });
            if (res.ok) {
                setR2Files(prev => {
                    const updated = prev.filter(f => !fileIds.includes(f.id));
                    // Update cache too
                    try { localStorage.setItem(R2_CACHE_KEY, JSON.stringify(updated)); } catch { }
                    return updated;
                });
                setSelectedFiles(new Set());
                setSuccess(`Deleted ${fileIds.length} file(s)`);
                setDeleteConfirm(false);
            }
        } catch {
            setError('Delete failed');
        } finally {
            setR2Loading(false);
        }
    };

    const toggleFileSelect = (id: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedFiles.size === displayedFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(displayedFiles.map(f => f.id)));
        }
    };

    useEffect(() => {
        if (isAuthorized && activeTab === 'media' && r2Files.length === 0) {
            fetchR2Files(true); // Load from cache first, then fetch fresh
        }
    }, [activeTab, isAuthorized]);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewPlan(user.plan || 'basic');
        setExpiryDate(user.planExpiresAt ? new Date(user.planExpiresAt).toISOString().split('T')[0] : '');
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'premium': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black';
            case 'standard': return 'bg-gradient-to-r from-purple-500 to-blue-500 text-white';
            default: return 'bg-white/20 text-white/60';
        }
    };

    const getProviderDisplay = (user: User) => {
        const isGoogle = user.provider === 'google' || user.image?.includes('googleusercontent') || user.image?.includes('google');
        return isGoogle ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 text-white/50 text-xs">📧 Email</span>
        );
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const displayUsers = searchResults.length > 0 ? searchResults : users;

    // Filtered files based on media type filter
    const displayedFiles = mediaFilter === 'all' ? r2Files : r2Files.filter(f => f.resource_type === mediaFilter);
    const imageCount = r2Files.filter(f => f.resource_type === 'image').length;
    const videoCount = r2Files.filter(f => f.resource_type === 'video').length;

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white flex items-center justify-center">
                <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Google Login Screen
    if (!session || !isAuthorized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/20 mb-4">
                            🛡️
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Admin Panel
                        </h1>
                        <p className="text-white/40 text-sm mt-1">GalleryEye Control Center</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {session && !isAuthorized ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-sm">⛔ {session.user?.email} is not authorized.</p>
                                </div>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full py-3 bg-white/10 rounded-xl font-medium text-sm hover:bg-white/20 transition-colors"
                                >
                                    Sign Out & Try Another Account
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => signIn('google')}
                                className="w-full py-4 bg-white rounded-xl font-bold text-lg text-gray-800 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Main Dashboard
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl">🛡️</div>
                        <div>
                            <h1 className="font-bold text-lg">Admin</h1>
                            <p className="text-[10px] text-white/40 truncate max-w-[120px]">{session.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('admin_authorized');
                            localStorage.removeItem('admin_email');
                            signOut({ callbackUrl: '/adminh4k3r009' });
                        }}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
                        Exit
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-t border-white/5">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'users' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' : 'text-white/40 hover:text-white/60'}`}
                    >
                        👥 Users ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('media')}
                        className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'media' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-white/40 hover:text-white/60'}`}
                    >
                        🗂️ R2 Media ({r2Files.length})
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4 pb-24">
                {/* Alerts */}
                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
                        {error}
                        <button onClick={() => setError('')} className="text-xl ml-2">×</button>
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-2xl text-green-400 text-sm flex items-center justify-between">
                        {success}
                        <button onClick={() => setSuccess('')} className="text-xl ml-2">×</button>
                    </div>
                )}

                {/* ====== USERS TAB ====== */}
                {activeTab === 'users' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-bold">{users.length}</div>
                                <div className="text-sm text-white/50">Total</div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-bold text-white/50">{users.filter(u => u.plan === 'basic').length}</div>
                                <div className="text-sm text-white/40">Basic</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-4">
                                <div className="text-3xl font-bold text-purple-400">{users.filter(u => u.plan === 'standard').length}</div>
                                <div className="text-sm text-purple-400/60">Standard</div>
                            </div>
                            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4">
                                <div className="text-3xl font-bold text-yellow-400">{users.filter(u => u.plan === 'premium').length}</div>
                                <div className="text-sm text-yellow-400/60">Premium</div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search email..."
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 text-sm"
                            />
                            <button onClick={handleSearch} className="px-5 py-3 bg-purple-600 rounded-xl font-medium text-sm hover:bg-purple-700 transition-colors">🔍</button>
                        </div>

                        {/* User Cards */}
                        <div className="space-y-3">
                            {displayUsers.map((user, idx) => (
                                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {user.image ? (
                                                <img src={user.image} alt="" className="w-12 h-12 rounded-full border-2 border-white/10" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold">
                                                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="overflow-hidden">
                                                <div className="font-semibold truncate max-w-[180px]">{user.name || 'No Name'}</div>
                                                <div className="text-xs text-white/50 truncate max-w-[180px]">{user.email}</div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getPlanBadgeColor(user.plan || 'basic')}`}>
                                            {user.plan || 'basic'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        {getProviderDisplay(user)}
                                        {user.planExpiresAt && (
                                            <span className="text-xs text-white/40">Expires: {new Date(user.planExpiresAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    <button onClick={() => openEditModal(user)} className="w-full py-2.5 bg-gradient-to-r from-purple-600/50 to-blue-600/50 border border-purple-500/30 rounded-xl text-sm font-medium hover:from-purple-600/70 hover:to-blue-600/70 transition-all">
                                        ✏️ Edit Plan
                                    </button>
                                </div>
                            ))}
                        </div>

                        {displayUsers.length === 0 && (
                            <div className="text-center py-12 text-white/40">
                                <div className="text-4xl mb-3">👤</div>
                                <p>No users found</p>
                            </div>
                        )}
                    </>
                )}

                {/* ====== MEDIA TAB ====== */}
                {activeTab === 'media' && (
                    <>
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold">{r2Files.length}</div>
                                <div className="text-[10px] text-white/40">Total</div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-green-400">{imageCount}</div>
                                <div className="text-[10px] text-green-400/60">📷 Images</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-red-400">{videoCount}</div>
                                <div className="text-[10px] text-red-400/60">🎬 Videos</div>
                            </div>
                        </div>

                        {/* Media Controls */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={r2UuidFilter}
                                onChange={(e) => setR2UuidFilter(e.target.value)}
                                placeholder="Filter by UUID (optional)..."
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-sm"
                            />
                            <button
                                onClick={() => fetchR2Files(false)}
                                disabled={r2Loading}
                                className="px-5 py-3 bg-cyan-600 rounded-xl font-medium text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50"
                            >
                                {r2Loading ? '...' : '🔄'}
                            </button>
                        </div>

                        {/* Media Type Filter */}
                        <div className="flex gap-2">
                            {(['all', 'image', 'video'] as const).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setMediaFilter(filter)}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${mediaFilter === filter
                                        ? filter === 'video' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : filter === 'image' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    {filter === 'all' ? `All (${r2Files.length})` : filter === 'image' ? `📷 Images (${imageCount})` : `🎬 Videos (${videoCount})`}
                                </button>
                            ))}
                        </div>

                        {/* Bulk Actions */}
                        {displayedFiles.length > 0 && (
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                <button
                                    onClick={selectAll}
                                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    {selectedFiles.size === displayedFiles.length ? '✓ Deselect All' : `☐ Select All (${displayedFiles.length})`}
                                </button>
                                {selectedFiles.size > 0 && (
                                    <button
                                        onClick={() => setDeleteConfirm(true)}
                                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
                                    >
                                        🗑️ Delete ({selectedFiles.size})
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Media Grid */}
                        {r2Loading && r2Files.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-white/40 text-sm">Loading R2 files...</p>
                            </div>
                        ) : displayedFiles.length === 0 ? (
                            <div className="text-center py-16 text-white/40">
                                <div className="text-5xl mb-3">📁</div>
                                <p>No files found</p>
                                <p className="text-xs mt-1">Enter a UUID and click refresh to browse</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {displayedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedFiles.has(file.id) ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-transparent hover:border-white/20'}`}
                                    >
                                        {/* Select checkbox */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFileSelect(file.id); }}
                                            className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all ${selectedFiles.has(file.id) ? 'bg-cyan-500 text-white' : 'bg-black/60 text-white/60 opacity-0 group-hover:opacity-100'}`}
                                        >
                                            {selectedFiles.has(file.id) ? '✓' : ''}
                                        </button>

                                        {/* Type badge */}
                                        <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold ${file.resource_type === 'video' ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                                            {file.resource_type === 'video' ? '🎬 VID' : '📷 IMG'}
                                        </div>

                                        {/* Content — videos have actual thumbnail now */}
                                        <div onClick={() => setMediaPreview(file)} className="aspect-square bg-black/40">
                                            {file.resource_type === 'video' ? (
                                                <div className="relative w-full h-full">
                                                    <video
                                                        src={file.url}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        preload="metadata"
                                                        playsInline
                                                        onLoadedMetadata={(e) => {
                                                            // Seek to 1 second to generate a proper thumbnail
                                                            (e.target as HTMLVideoElement).currentTime = 1;
                                                        }}
                                                    />
                                                    {/* Play overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={file.url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            )}
                                        </div>

                                        {/* Date + Size */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                                            <p className="text-[9px] text-white/50 truncate">
                                                {new Date(file.created_at).toLocaleString()}
                                                {file.size ? ` • ${formatFileSize(file.size)}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Loading indicator while refreshing with cached data shown */}
                        {r2Loading && r2Files.length > 0 && (
                            <div className="text-center py-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400">
                                    <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                    Refreshing...
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Media Preview Modal */}
            {mediaPreview && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setMediaPreview(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        {/* Close */}
                        <button
                            onClick={() => setMediaPreview(null)}
                            className="absolute -top-12 right-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                        >
                            ✕
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={() => { deleteR2Files([mediaPreview.id]); setMediaPreview(null); }}
                            className="absolute -top-12 left-0 px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-medium hover:bg-red-500/30 transition-colors"
                        >
                            🗑️ Delete
                        </button>

                        {mediaPreview.resource_type === 'video' ? (
                            <video
                                src={mediaPreview.url}
                                controls
                                autoPlay
                                className="w-full max-h-[80vh] rounded-2xl"
                            />
                        ) : (
                            <img
                                src={mediaPreview.url}
                                alt=""
                                className="w-full max-h-[80vh] object-contain rounded-2xl"
                            />
                        )}

                        <p className="text-center text-white/40 text-xs mt-3 truncate">{mediaPreview.id}</p>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a2e] border border-white/20 rounded-3xl p-6 w-full max-w-sm">
                        <div className="text-center mb-4">
                            <div className="text-5xl mb-3">⚠️</div>
                            <h2 className="text-xl font-bold">Delete {selectedFiles.size} file(s)?</h2>
                            <p className="text-sm text-white/50 mt-2">This will permanently delete them from R2 storage.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteR2Files(Array.from(selectedFiles))}
                                disabled={r2Loading}
                                className="flex-1 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {r2Loading ? 'Deleting...' : 'Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Plan Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-[#1a1a2e] border-t md:border border-white/20 rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md">
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />
                        <h2 className="text-xl font-bold mb-2">Edit Plan</h2>
                        <p className="text-sm text-white/50 mb-6 truncate">{selectedUser.email}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-3">Select Plan</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['basic', 'standard', 'premium'] as const).map(plan => (
                                        <button
                                            key={plan}
                                            onClick={() => setNewPlan(plan)}
                                            className={`py-3 px-2 rounded-xl text-sm font-bold capitalize transition-all ${newPlan === plan ? getPlanBadgeColor(plan) + ' scale-105 shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}
                                        >
                                            {plan}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {newPlan !== 'basic' && (
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500"
                                    />
                                    <p className="text-xs text-white/40 mt-1">Leave empty for no expiry</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setSelectedUser(null)} className="flex-1 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors">Cancel</button>
                            <button onClick={handleSetPlan} disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50">
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Refresh Button */}
            <button
                onClick={() => {
                    if (activeTab === 'users' && session?.user?.email) fetchUsers(session.user.email);
                    else fetchR2Files(false);
                }}
                disabled={isLoading || r2Loading}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 active:scale-95 transition-transform z-40"
            >
                {(isLoading || r2Loading) ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                )}
            </button>
        </div>
    );
}
