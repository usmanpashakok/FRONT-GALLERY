import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

interface GalleryFile {
    id: string;
    url: string;
    created_at: string;
    resource_type: 'image' | 'video';
    format: string;
}

interface GalleryViewerProps {
    uuid: string;
    backendUrl: string;
}

export default function GalleryViewer({ uuid, backendUrl }: GalleryViewerProps) {
    const [files, setFiles] = useState<GalleryFile[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [viewingFile, setViewingFile] = useState<GalleryFile | null>(null);
    const [isZipping, setIsZipping] = useState(false);

    // Socket Connection
    useEffect(() => {
        const socket = io(backendUrl);
        socket.emit('join_room', { uuid });

        socket.on('new_image', (newFile: GalleryFile) => {
            setFiles(prev => [newFile, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, [uuid, backendUrl]);

    // Fetch Initial Data
    useEffect(() => {
        fetch(`${backendUrl}/images?uuid=${uuid}`)
            .then(res => res.json())
            .then(data => setFiles(data))
            .catch(err => console.error(err));
    }, [uuid, backendUrl]);

    // Filter Files
    const filteredFiles = useMemo(() => {
        if (activeTab === 'all') return files;
        return files.filter(f => f.resource_type === activeTab);
    }, [files, activeTab]);

    // Selection Logic
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedFiles(newSet);
    };

    const selectAll = () => {
        if (selectedFiles.size === filteredFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
        }
    };

    // Download Logic
    const handleDownloadZip = async () => {
        if (selectedFiles.size === 0) return;
        setIsZipping(true);

        const filesToDownload = files
            .filter(f => selectedFiles.has(f.id))
            .map(f => ({
                url: f.url,
                filename: `${f.resource_type}_${f.created_at}.${f.format}`
            }));

        try {
            const response = await fetch(`${backendUrl}/download-zip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filesToDownload })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'gallery_download.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSelectedFiles(new Set());
            }
        } catch (error) {
            console.error('Download failed', error);
            alert('Download failed');
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Gallery Eye
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Synced Media Vault</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-800 rounded-full p-1">
                    {['all', 'image', 'video'].filter(tab => {
                        if (tab === 'all') return true;
                        return files.some(f => f.resource_type === tab);
                    }).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}s
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {selectedFiles.size > 0 && (
                        <button
                            onClick={handleDownloadZip}
                            disabled={isZipping}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            {isZipping ? 'Zipping...' : `Download (${selectedFiles.size})`}
                        </button>
                    )}
                    <button
                        onClick={selectAll}
                        className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors"
                    >
                        {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            {/* Grid */}
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p className="text-lg">No {activeTab}s found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            className={`relative group aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 transition-all ${selectedFiles.has(file.id) ? 'border-blue-500' : 'border-transparent hover:border-gray-600'
                                }`}
                        >
                            {/* Media */}
                            <div
                                className="w-full h-full cursor-pointer"
                                onClick={() => setViewingFile(file)}
                            >
                                {file.resource_type === 'video' ? (
                                    <video src={file.url} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={file.url} alt="Gallery Item" className="w-full h-full object-cover" loading="lazy" />
                                )}
                            </div>

                            {/* Overlay Info */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* Checkbox */}
                            <div className="absolute top-2 right-2 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.id)}
                                    onChange={() => toggleSelection(file.id)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </div>

                            {/* Video Indicator */}
                            {file.resource_type === 'video' && (
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                                    <span>▶</span> Video
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Viewer */}
            {viewingFile && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <button
                        onClick={() => setViewingFile(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-4xl font-light"
                    >
                        &times;
                    </button>

                    <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
                        {viewingFile.resource_type === 'video' ? (
                            <video
                                src={viewingFile.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                            />
                        ) : (
                            <img
                                src={viewingFile.url}
                                alt="Full View"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}

                        <div className="mt-6 flex gap-4">
                            <a
                                href={viewingFile.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-medium transition-colors"
                            >
                                Download Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
