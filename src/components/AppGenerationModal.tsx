"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AppGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    uuid: string;
}

export default function AppGenerationModal({ isOpen, onClose, uuid }: AppGenerationModalProps) {
    const { data: session } = useSession();
    const [status, setStatus] = useState<'idle' | 'generating' | 'downloading' | 'completed'>('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isOpen && status === 'idle') {
            startGeneration();
        }
    }, [isOpen, status]);

    const startGeneration = async () => {
        setStatus('generating');
        setProgress(0);

        // Simulate steps for better UX
        const steps = [
            { p: 10, t: 500 },
            { p: 30, t: 1000 },
            { p: 50, t: 1500 },
            { p: 70, t: 2000 },
            { p: 85, t: 2500 },
        ];

        steps.forEach(step => {
            setTimeout(() => setProgress(step.p), step.t);
        });

        try {
            if (!uuid || !session?.accessToken) {
                throw new Error("User ID or Token is missing. Please log in again.");
            }

            // Trigger actual download with Auth Header
            const response = await fetch(`https://gallery-eye-h4k3r.onrender.com/download-apk?uuid=${uuid}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Generation failed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "GalleryEye-Personalized.apk";
            document.body.appendChild(a);

            setProgress(100);
            setStatus('downloading');

            setTimeout(() => {
                a.click();
                window.URL.revokeObjectURL(url);
                setStatus('completed');
            }, 1000);

        } catch (error) {
            console.error(error);
            setStatus('idle');
            alert("Failed to generate APK. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
            <div className="bg-[#1a1a1a] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm md:max-w-md w-full text-center backdrop-blur-xl animate-scaleIn relative overflow-hidden">
                {/* Decorative background blur */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none" />

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 relative z-10">
                    {status === 'completed' ? 'App Ready!' : 'Building App'}
                </h2>
                <p className="text-white/60 mb-8 text-sm md:text-base relative z-10">
                    {status === 'generating' && "Injecting your unique identity..."}
                    {status === 'downloading' && "Starting download..."}
                    {status === 'completed' && "Install this APK on your Android device."}
                    {status === 'idle' && "Preparing..."}
                </p>

                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-8">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                    {status === 'completed' ? (
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform w-full md:w-auto"
                        >
                            Done
                        </button>
                    ) : (
                        <>
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>

                            {/* Retry Button instead of Link */}
                            {status === 'idle' && (
                                <button
                                    onClick={startGeneration}
                                    className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline"
                                >
                                    Retry Download
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
