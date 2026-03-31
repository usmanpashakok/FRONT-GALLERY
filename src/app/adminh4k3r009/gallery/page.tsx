"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalGallery() {
    const router = useRouter();
    const [adminSecret, setAdminSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const [galleryItems, setGalleryItems] = useState<any[]>([]);
    const [isGalleryLoading, setIsGalleryLoading] = useState(false);
    const [selectedGalleryItems, setSelectedGalleryItems] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const BACKEND_URL = 'https://backend-api-gallery.onrender.com';

    useEffect(() => {
        const saved = localStorage.getItem('adminSecret');
        if (saved) {
            setAdminSecret(saved);
        }
    }, []);

    const handleLogin = async () => {
        if (!adminSecret) {
            setError('Admin secret required');
            return;
        }

        setIsGalleryLoading(true);
        setError('');

        try {
            // Test auth by fetching gallery
            const res = await fetch(`${BACKEND_URL}/admin/gallery`, {
                headers: { 'x-admin-secret': adminSecret }
            });

            if (res.ok) {
                const data = await res.json();
                setGalleryItems(data);
                setIsAuthenticated(true);
                localStorage.setItem('adminSecret', adminSecret);
            } else {
                setError('Invalid admin secret');
            }
        } catch (e) {
            setError('Failed to connect to server');
        } finally {
            setIsGalleryLoading(false);
        }
    };

    const fetchGallery = async () => {
        setIsGalleryLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/admin/gallery`, {
                headers: { 'x-admin-secret': adminSecret }
            });
            if (res.ok) {
                const data = await res.json();
                setGalleryItems(data);
            } else {
                setError('Failed to fetch gallery');
            }
        } catch (e) {
            setError('Error connecting to server for gallery');
        } finally {
            setIsGalleryLoading(false);
        }
    };

    const deleteGalleryItems = async (ids: string[], isAll = false) => {
        if (!confirm(`Are you sure you want to delete ${isAll ? 'ALL media from the ENTIRE bucket' : ids.length + ' items'}? This cannot be undone.`)) return;

        setIsGalleryLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/admin/gallery/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': adminSecret
                },
                body: JSON.stringify({ ids: isAll ? [] : ids, deleteAll: isAll })
            });

            if (res.ok) {
                setSuccess(isAll ? 'All gallery media cleared!' : `Deleted ${ids.length} items.`);
                setSelectedGalleryItems(new Set());
                fetchGallery(); // Refresh after delete
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

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20 mb-4">
                            🖼️
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            Global Gallery
                        </h1>
                        <p className="text-white/40 text-sm mt-1">Admin Access Only</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Secret Key</label>
                                <input
                                    type="password"
                                    value={adminSecret}
                                    onChange={(e) => setAdminSecret(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="Enter secret..."
                                    className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center text-lg tracking-widest"
                                />
                            </div>
                            <button
                                onClick={handleLogin}
                                disabled={isGalleryLoading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isGalleryLoading ? 'Connecting...' : 'Access Gallery'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/adminh4k3r009')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl">
                            🔙
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">Global Gallery</h1>
                            <p className="text-xs text-white/40">{galleryItems.length} media files</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                             onClick={fetchGallery}
                             className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('adminSecret');
                                setIsAuthenticated(false);
                                setAdminSecret('');
                            }}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6 pb-24">
                {/* Alerts */}
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

                {/* Actions */}
                <div className="flex items-center justify-between mb-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="text-sm text-white/50">
                        {selectedGalleryItems.size > 0 ? `${selectedGalleryItems.size} items selected` : 'Select media to delete'}
                    </div>
                    <div className="flex gap-2">
                        {selectedGalleryItems.size > 0 && (
                            <button 
                                onClick={() => deleteGalleryItems(Array.from(selectedGalleryItems))}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold border border-red-500/30 hover:bg-red-500/30"
                            >
                                Delete Selected
                            </button>
                        )}
                        <button 
                            onClick={() => deleteGalleryItems([], true)}
                            className="px-4 py-2 bg-red-700 text-white rounded-xl text-sm font-bold border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600"
                        >
                            ⚠️ CLEAR BUCKET
                        </button>
                    </div>
                </div>

                {/* Gallery List */}
                {isGalleryLoading && galleryItems.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/50">Fetching all media from Cloudflare R2...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {galleryItems.map((item) => (
                            <div 
                                key={item.id} 
                                className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedGalleryItems.has(item.id) ? 'border-red-500 scale-[0.98] shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-transparent bg-white/5'}`}
                                onClick={() => toggleGallerySelect(item.id)}
                            >
                                {item.resource_type === 'video' ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2">▶</div>
                                        <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-full">Video</span>
                                    </div>
                                ) : (
                                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                                )}
                                
                                {/* Select indicator */}
                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedGalleryItems.has(item.id) ? 'bg-red-500 border-red-500' : 'border-white/50 bg-black/50'}`}>
                                    {selectedGalleryItems.has(item.id) && <span className="text-white text-xs block -mt-[1px]">✓</span>}
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                                    <p className="text-[10px] text-white/50 truncate font-mono">User: {item.uuid}</p>
                                    <p className="text-[10px] text-white/40">{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!isGalleryLoading && galleryItems.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <div className="text-6xl mb-4">🏜️</div>
                        <h3 className="text-xl font-bold mb-2">Bucket is empty</h3>
                        <p className="text-sm text-white/40">No media found in the global gallery across any users.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
