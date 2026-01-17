"use client";

interface SyncOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderName: string;
    mediaType: 'image' | 'video';
    itemCount: number;
    userPlan: 'basic' | 'standard' | 'premium';
    onSelectOneByOne: (count: number | 'all') => void;
    onSelectZip: () => void;
    onUpgrade: () => void;
}

export default function SyncOptionsModal({
    isOpen,
    onClose,
    folderName,
    mediaType,
    itemCount,
    userPlan,
    onSelectOneByOne,
    onSelectZip,
    onUpgrade
}: SyncOptionsModalProps) {
    if (!isOpen) return null;

    const isPremium = userPlan === 'premium';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
            <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl animate-scaleUp overflow-hidden">

                {/* Header */}
                <div className="p-5 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            </svg>
                            Download Options
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Folder Info */}
                <div className="p-5">
                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <div className="font-semibold">{folderName}</div>
                                <div className="text-xs text-white/40">All {mediaType === 'video' ? 'videos' : 'photos'}</div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-white/60 mb-6 text-center">
                        Choose how you want to download:
                    </p>

                    {/* Options */}
                    <div className="space-y-3">

                        {/* ZIP Download Option */}
                        <button
                            onClick={() => {
                                if (isPremium) {
                                    onSelectZip();
                                    onClose();
                                } else {
                                    onUpgrade();
                                    onClose();
                                }
                            }}
                            className={`w-full p-4 rounded-xl border transition-all group text-left relative overflow-hidden ${isPremium
                                    ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20'
                                    : 'border-yellow-500/30 bg-yellow-500/5'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isPremium
                                        ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                                        : 'bg-yellow-500/20'
                                    }`}>
                                    📦
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                                        ZIP Download
                                        {isPremium ? (
                                            <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">RECOMMENDED</span>
                                        ) : (
                                            <span className="text-[10px] px-2 py-0.5 bg-yellow-500 text-black rounded-full font-bold flex items-center gap-1">
                                                👑 PREMIUM ONLY
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-white/50">
                                        {isPremium
                                            ? 'All items in one file, faster download'
                                            : 'Upgrade to Premium to unlock ZIP downloads'}
                                    </div>
                                </div>
                                {isPremium ? (
                                    <svg className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                )}
                            </div>
                        </button>

                        {/* One by One Option */}
                        <button
                            onClick={() => {
                                onSelectOneByOne('all');
                                onClose();
                            }}
                            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                                    📷
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">One by One</div>
                                    <div className="text-xs text-white/50">Sync items individually to gallery</div>
                                </div>
                                <svg className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
