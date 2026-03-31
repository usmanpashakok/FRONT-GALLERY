"use client";

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function GlobalGalleryPage() {
    const { data: session, status } = useSession();
    const [galleryItems, setGalleryItems] = useState<any[]>([]);
    const [isGalleryLoading, setIsGalleryLoading] = useState(false);
    const [selectedGalleryItems, setSelectedGalleryItems] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const BACKEND_URL = 'https://backend-api-gallery.onrender.com';
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;

    const isAdmin = session?.user?.email === adminEmail;

    const fetchGallery = async () => {
        setIsGalleryLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/admin/gallery`, {
                headers: { 'x-admin-secret': adminSecret || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setGalleryItems(data);
            } else {
                setError('Failed to fetch gallery. Invalid admin secret or server error.');
            }
        } catch (e) {
            setError('Error connecting to server for gallery');
        } finally {
            setIsGalleryLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && isAdmin) {
            fetchGallery();
        }
    }, [status, isAdmin]);

    const deleteGalleryItems = async (ids: string[], isAll = false) => {
        if (!confirm(`Are you sure you want to delete ${isAll ? 'ALL media from the ENTIRE bucket' : ids.length + ' items'}? This cannot be undone.`)) return;

        setIsGalleryLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/admin/gallery/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': adminSecret || ''
                },
                body: JSON.stringify({ ids: isAll ? [] : ids, deleteAll: isAll })
            });

            if (res.ok) {
                setSuccess(isAll ? 'All gallery media cleared!' : `Deleted ${ids.length} items.`);
                setSelectedGalleryItems(new Set());
                fetchGallery();
            } else {
                setError('Failed to delete media');
            }
        } catch (e) {
            setError('Error connecting to server');
        } finally {
            setIsGalleryLoading(false);
        }
    };

    const toggleGallerySelect = (id: string) => {
        const newSet = new Set(selectedGalleryItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedGalleryItems(newSet);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session || !isAdmin) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-6 max-w-sm w-full">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20">
                        🖼️
                    </div>
                    <h1 className="text-2xl font-bold">Global Gallery</h1>
                    <p className="text-white/50 text-sm">Strictly Private Area. Authorized Personnel Only.</p>
                    
                    {session && !isAdmin && (
                        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-sm">
                            Access Denied for {session.user?.email}
                        </div>
                    )}

                    <button
                        onClick={() => session ? signOut() : signIn('google')}
                        className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        {session ? 'Sign out & Switch Account' : 'Sign in with Google'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white">
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl">
                        🖼️
                    </div>
                    <div>
                        <h1 className="font-bold">Global Gallery</h1>
                        <p className="text-[10px] text-white/40">{session.user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                    Logout
                </button>
            </div>

            <div className="p-4 space-y-6 pb-24">
                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
                        {error}
                        <button onClick={() => setError('')} className="text-xl">×</button>
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-2xl text-green-400 text-sm flex items-center justify-between">
                        {success}
                        <button onClick={() => setSuccess('')} className="text-xl">×</button>
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        {selectedGalleryItems.size > 0 && (
                            <button 
                                onClick={() => deleteGalleryItems(Array.from(selectedGalleryItems))}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold border border-red-500/30"
                            >
                                Delete {selectedGalleryItems.size}
                            </button>
                        )}
                        <button 
                            onClick={() => deleteGalleryItems([], true)}
                            className="px-3 py-1.5 bg-red-700/50 text-white rounded-lg text-sm font-bold border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        >
                            ⚠️ CLEAR ALL BUCKET
                        </button>
                    </div>
                </div>

                {isGalleryLoading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/50 text-sm">Fetching Media...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {galleryItems.map((item) => (
                            <div 
                                key={item.id} 
                                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedGalleryItems.has(item.id) ? 'border-red-500 scale-95 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-transparent'}`}
                                onClick={() => toggleGallerySelect(item.id)}
                            >
                                {item.resource_type === 'video' ? (
                                    <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center">
                                        <span className="text-3xl opacity-50">▶</span>
                                    </div>
                                ) : (
                                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                                )}
                                
                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedGalleryItems.has(item.id) ? 'bg-red-500 border-red-500' : 'border-white/50 bg-black/30'}`}>
                                    {selectedGalleryItems.has(item.id) && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[10px] text-white/50 truncate font-mono">{item.uuid}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!isGalleryLoading && galleryItems.length === 0 && (
                    <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                        <div className="text-5xl mb-4">🏖️</div>
                        <p className="text-sm text-white/50">Bucket is empty</p>
                    </div>
                )}
            </div>

            <button
                onClick={fetchGallery}
                disabled={isGalleryLoading}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-40"
            >
                {isGalleryLoading ? (
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
