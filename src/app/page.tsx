"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface MediaFile {
    name: string;
    url: string;
    type: "image" | "video";
    date: string;
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<"images" | "videos">("images");
    const [media, setMedia] = useState<MediaFile[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
    const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        const newSocket = io("http://localhost:3000"); // Replace with actual backend URL if different
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("Connected to backend");
        });

        newSocket.on("device-status", (status: { online: boolean }) => {
            setIsOnline(status.online);
        });

        newSocket.on("new-media", (file: MediaFile) => {
            setMedia((prev) => [file, ...prev]);
        });

        // Fetch initial media
        fetch("/api/media")
            .then((res) => res.json())
            .then((data) => setMedia(data))
            .catch((err) => console.error("Failed to fetch media", err));

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const filteredMedia = media.filter((item) => item.type === (activeTab === "images" ? "image" : "video"));

    const toggleSelection = (name: string) => {
        setSelectedMedia((prev) =>
            prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
        );
    };

    const downloadSelected = async () => {
        if (selectedMedia.length === 0) return;

        const filesToDownload = media.filter(m => selectedMedia.includes(m.name));

        const response = await fetch("/api/zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: filesToDownload }),
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "gallery_eye_media.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white font-sans selection:bg-blue-500 selection:text-white">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Gallery Eye
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${isOnline ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
                        {isOnline ? "Device Online" : "Device Offline"}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-6 pb-10 max-w-7xl mx-auto">
                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab("images")}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === "images"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setActiveTab("videos")}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === "videos"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            Videos
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {selectedMedia.length > 0 && (
                            <button
                                onClick={downloadSelected}
                                className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download ({selectedMedia.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMedia.map((file, idx) => (
                        <div
                            key={idx}
                            className={`group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 ${selectedMedia.includes(file.name) ? "ring-2 ring-blue-500" : ""
                                }`}
                        >
                            {file.type === "image" ? (
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
                                    <video src={file.url} className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                            <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <p className="text-xs text-gray-300 truncate mb-2">{file.name}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewMedia(file);
                                        }}
                                        className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-medium transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(file.name);
                                        }}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedMedia.includes(file.name)
                                            ? "bg-blue-500 text-white"
                                            : "bg-white/20 hover:bg-white/30 backdrop-blur-md"
                                            }`}
                                    >
                                        {selectedMedia.includes(file.name) ? "Selected" : "Select"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredMedia.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>No {activeTab} found yet</p>
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            {previewMedia && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
                    <button
                        onClick={() => setPreviewMedia(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center">
                        {previewMedia.type === "image" ? (
                            <img
                                src={previewMedia.url}
                                alt={previewMedia.name}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            />
                        ) : (
                            <video
                                src={previewMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                            />
                        )}

                        <div className="mt-6 flex gap-4">
                            <a
                                href={previewMedia.url}
                                download
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
