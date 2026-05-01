"use client";

import { useState } from 'react';

interface BulkDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderName: string;
    userPlan: 'basic' | 'standard' | 'premium';
    userUuid: string;
    onSuccess: (message: string) => void;
}

export default function BulkDownloadModal({
    isOpen,
    onClose,
    folderName,
    userPlan,
    userUuid,
    onSuccess
}: BulkDownloadModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'queued' | 'error'>('idle');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const isPremium = userPlan === 'premium';

    const handleBulkDownload = async () => {
        if (!isPremium) return;

        setIsLoading(true);
        setStatus('idle');

        try {
            const response = await fetch('https://p01--gallery-eye--9zr85m7yb6s4.code.run/bulk-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uuid: userUuid,
                    folderName
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('queued');
                setMessage(data.message || 'Processing started! Check your email.');
                onSuccess(data.message);

                // Auto close after 3 seconds
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(data.message || data.error || 'Failed to start download');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl animate-scaleUp overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            Bulk Download
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!isPremium ? (
                        // Not Premium - Show upgrade prompt
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-3xl">
                                👑
                            </div>
                            <h4 className="text-lg font-bold mb-2">Premium Feature</h4>
                            <p className="text-white/60 text-sm mb-6">
                                Bulk download is available for Premium users only. Upgrade to download entire folders as ZIP.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold hover:scale-105 transition-transform"
                            >
                                Upgrade to Premium
                            </button>
                        </div>
                    ) : status === 'queued' ? (
                        // Success state
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h4 className="text-lg font-bold mb-2 text-green-400">Processing Started!</h4>
                            <p className="text-white/60 text-sm">
                                {message}
                            </p>
                            <p className="text-white/40 text-xs mt-4">
                                You can close this page. We'll email you when ready.
                            </p>
                        </div>
                    ) : status === 'error' ? (
                        // Error state
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <h4 className="text-lg font-bold mb-2 text-red-400">Error</h4>
                            <p className="text-white/60 text-sm mb-6">{message}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        // Initial state - show download option
                        <div>
                            <div className="bg-white/5 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-semibold">{folderName}</div>
                                        <div className="text-xs text-white/40">All items in this folder</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 text-sm text-white/60">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    All photos & videos will be zipped
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    Download link sent via email
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Processing takes 5-30 minutes
                                </div>
                            </div>

                            <button
                                onClick={handleBulkDownload}
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                        </svg>
                                        Download All as ZIP
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
