"use client";

import React, { useState } from 'react';

interface VideoModalProps {
    videoId: string;
    label?: string;
    variant?: 'thumbnail' | 'button'; // thumbnail for login, button for menu
}

const VideoModal = ({ videoId, label = "Watch Tutorial", variant = 'thumbnail' }: VideoModalProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {variant === 'thumbnail' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all shadow-lg"
                >
                    <img
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt="Video Thumbnail"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs font-semibold text-white/90">{label}</p>
                    </div>
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
                >
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                        </svg>
                    </div>
                    <div>
                        <div className="font-semibold">How to use</div>
                        <div className="text-xs text-white/50">Watch video tutorial</div>
                    </div>
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn p-4">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50 text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-scaleUp bg-black">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            title="Tutorial Video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}
        </>
    );
};

export default VideoModal;
