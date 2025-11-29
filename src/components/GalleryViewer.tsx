'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface MediaFile {
    id: string;
    url: string;
    created_at: string;
    resource_type: 'image' | 'video';
    format?: string;
}

interface GalleryViewerProps {
    media: MediaFile[];
}

export default function GalleryViewer({ media }: GalleryViewerProps) {
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'all' | 'images' | 'videos'>('all');

    const filteredMedia = media.filter(item => {
        if (viewMode === 'images') return item.resource_type === 'image';
        if (viewMode === 'videos') return item.resource_type === 'video';
        return true;
    });

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const downloadSingle = async (url: string, id: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const filename = `${id.split('/').pop()}.${blob.type.split('/')[1]}`;
            saveAs(blob, filename);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const downloadSelected = async () => {
        if (selectedItems.size === 0) return;

        const zip = new JSZip();
        const selectedMedia = media.filter(item => selectedItems.has(item.id));

        for (const item of selectedMedia) {
            try {
                const response = await fetch(item.url);
                const blob = await response.blob();
                const filename = `${item.id.split('/').pop()}.${blob.type.split('/')[1]}`;
                zip.file(filename, blob);
            } catch (error) {
                console.error(`Failed to add ${item.id}:`, error);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `gallery-eye-${Date.now()}.zip`);
        setSelectedItems(new Set());
    };

    const downloadAll = async () => {
        const zip = new JSZip();

        for (const item of filteredMedia) {
            try {
                const response = await fetch(item.url);
                const blob = await response.blob();
                const filename = `${item.id.split('/').pop()}.${blob.type.split('/')[1]}`;
                zip.file(filename, blob);
            } catch (error) {
                console.error(`Failed to add ${item.id}:`, error);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `gallery-eye-all-${Date.now()}.zip`);
    };

    return (
        <div>
            {/* Filter & Action Bar */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-2 rounded-md transition-colors ${viewMode === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        All ({media.length})
                    </button>
                    <button
                        onClick={() => setViewMode('images')}
                        className={`px-4 py-2 rounded-md transition-colors ${viewMode === 'images'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        📷 Photos ({media.filter(m => m.resource_type === 'image').length})
                    </button>
                    <button
                        onClick={() => setViewMode('videos')}
                        className={`px-4 py-2 rounded-md transition-colors ${viewMode === 'videos'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        🎥 Videos ({media.filter(m => m.resource_type === 'video').length})
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {selectedItems.size > 0 && (
                        <button
                            onClick={downloadSelected}
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            📥 Download Selected ({selectedItems.size})
                        </button>
                    )}
                    {filteredMedia.length > 0 && (
                        <button
                            onClick={downloadAll}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            📦 Download All
                        </button>
                    )}
                </div>
            </div>

            {/* Gallery Grid */}
            {filteredMedia.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <p className="text-xl">No {viewMode === 'all' ? 'media' : viewMode} yet</p>
                    <p className="text-sm mt-2">Upload some files from your Android app</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredMedia.map((item) => (
                        <div key={item.id} className="relative group">
                            {/* Thumbnail */}
                            <div
                                onClick={() => setSelectedMedia(item)}
                                className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer relative"
                            >
                                {item.resource_type === 'image' ? (
                                    <img
                                        src={item.url}
                                        alt={item.id}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="relative w-full h-full">
                                        <video
                                            src={item.url}
                                            className="w-full h-full object-cover"
                                            muted
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="bg-white/90 rounded-full p-3">
                                                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Selection Checkbox */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelection(item.id);
                                    }}
                                    className="absolute top-2 right-2 z-10"
                                >
                                    <div
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems.has(item.id)
                                                ? 'bg-purple-600 border-purple-600'
                                                : 'bg-black/50 border-white/70'
                                            }`}
                                    >
                                        {selectedItems.has(item.id) && (
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <p className="text-xs text-gray-400 mt-1 text-center">
                                {new Date(item.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Viewer */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedMedia(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                        onClick={() => setSelectedMedia(null)}
                    >
                        ×
                    </button>

                    <div
                        className="max-w-5xl max-h-full flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedMedia.resource_type === 'image' ? (
                            <img
                                src={selectedMedia.url}
                                alt={selectedMedia.id}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            />
                        ) : (
                            <video
                                src={selectedMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            />
                        )}

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => downloadSingle(selectedMedia.url, selectedMedia.id)}
                                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors"
                            >
                                📥 Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
