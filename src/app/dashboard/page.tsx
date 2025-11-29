"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

let socket;

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [files, setFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('images'); // 'images' or 'videos'
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [modalFile, setModalFile] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.uuid) {
            fetchFiles();

            socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
            socket.emit('register_web', { uuid: session.user.uuid });

            socket.on('new_image', (newFile) => {
                setFiles(prev => [newFile, ...prev]);
            });

            return () => socket.disconnect();
        }
    }, [session]);

    const fetchFiles = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/images?uuid=${session.user.uuid}`);
            const data = await res.json();
            setFiles(data);
        } catch (e) {
            console.error(e);
        }
    };

    const images = files.filter(f => f.resource_type === 'image');
    const videos = files.filter(f => f.resource_type === 'video');
    const currentFiles = activeTab === 'images' ? images : videos;

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedFiles(newSelected);
    };

    const selectAll = () => {
        if (selectedFiles.size === currentFiles.length) {
            setSelectedFiles(new Set());
        } else {
            const newSelected = new Set();
            currentFiles.forEach(f => newSelected.add(f.id));
            setSelectedFiles(newSelected);
        }
    };

    const downloadZip = async (filesToDownload) => {
        setIsDownloading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/download-zip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: filesToDownload.map(f => ({
                        url: f.url,
                        filename: `${f.id}.${f.format || (f.resource_type === 'video' ? 'mp4' : 'jpg')}`
                    }))
                })
            });

            if (!res.ok) throw new Error('Download failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gallery_download_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('Download failed');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Gallery Eye
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                const toDownload = files.filter(f => selectedFiles.has(f.id));
                                if (toDownload.length) downloadZip(toDownload);
                            }}
                            disabled={selectedFiles.size === 0 || isDownloading}
                            className="px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 disabled:opacity-50"
                        >
                            {isDownloading ? 'Zipping...' : `Download Selected (${selectedFiles.size})`}
                        </button>
                        <button
                            onClick={() => downloadZip(files)}
                            disabled={files.length === 0 || isDownloading}
                            className="px-4 py-2 bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50"
                        >
                            Download All
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'images' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Images ({images.length})
                    </button>
                    {videos.length > 0 && (
                        <button
                            onClick={() => setActiveTab('videos')}
                            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'videos' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Videos ({videos.length})
                        </button>
                    )}
                    <button onClick={selectAll} className="ml-auto text-sm text-gray-400 hover:text-white">
                        {selectedFiles.size === currentFiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {currentFiles.map(file => (
                        <div key={file.id} className="relative group aspect-square bg-gray-900 rounded-xl overflow-hidden cursor-pointer">
                            {file.resource_type === 'video' ? (
                                <video src={file.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <img src={file.url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setModalFile(file); }}
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/40 backdrop-blur-sm"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                                    className={`p-2 rounded-full backdrop-blur-sm ${selectedFiles.has(file.id) ? 'bg-blue-500 text-white' : 'bg-white/20 hover:bg-white/40'}`}
                                >
                                    {selectedFiles.has(file.id) ? '✓' : '+'}
                                </button>
                            </div>

                            {/* Video Indicator */}
                            {file.resource_type === 'video' && (
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs">▶</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Modal */}
                {modalFile && (
                    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setModalFile(null)}>
                        <div className="max-w-5xl w-full max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
                            {modalFile.resource_type === 'video' ? (
                                <video src={modalFile.url} controls autoPlay className="w-full h-full max-h-[80vh] object-contain rounded-lg" />
                            ) : (
                                <img src={modalFile.url} alt="" className="w-full h-full max-h-[80vh] object-contain rounded-lg" />
                            )}

                            <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
                                <a
                                    href={modalFile.url}
                                    download
                                    target="_blank"
                                    className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200"
                                >
                                    Download Original
                                </a>
                                <button
                                    onClick={() => setModalFile(null)}
                                    className="px-6 py-2 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
