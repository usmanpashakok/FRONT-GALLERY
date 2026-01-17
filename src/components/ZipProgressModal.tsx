"use client";

interface ZipProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: 'creating' | 'uploading' | 'ready' | 'error';
    current: number;
    total: number;
    folderName: string;
    downloadUrl?: string;
    error?: string;
}

export default function ZipProgressModal({
    isOpen,
    onClose,
    stage,
    current,
    total,
    folderName,
    downloadUrl,
    error
}: ZipProgressModalProps) {
    if (!isOpen) return null;

    const progress = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
            <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl animate-scaleUp overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                <div className="p-6 text-center">

                    {/* Icon */}
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl ${stage === 'error' ? 'bg-red-500/20' :
                            stage === 'ready' ? 'bg-green-500/20' :
                                'bg-purple-500/20'
                        }`}>
                        {stage === 'creating' && '📦'}
                        {stage === 'uploading' && '☁️'}
                        {stage === 'ready' && '✅'}
                        {stage === 'error' && '❌'}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold mb-2">
                        {stage === 'creating' && 'Creating ZIP...'}
                        {stage === 'uploading' && 'Uploading...'}
                        {stage === 'ready' && 'Ready!'}
                        {stage === 'error' && 'Error'}
                    </h3>

                    {/* Folder Name */}
                    <p className="text-sm text-white/60 mb-4">{folderName}</p>

                    {/* Progress or Status */}
                    {(stage === 'creating' || stage === 'uploading') && (
                        <>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: stage === 'uploading' ? '90%' : `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-white/40">
                                {stage === 'creating' ? `${current} / ${total} files` : 'Uploading to cloud...'}
                            </p>
                            <p className="text-xs text-white/30 mt-4">
                                You can close this popup - process will continue in background
                            </p>
                        </>
                    )}

                    {stage === 'ready' && downloadUrl && (
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 mt-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-semibold hover:scale-105 transition-transform"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Download ZIP
                        </a>
                    )}

                    {stage === 'error' && (
                        <p className="text-sm text-red-400">{error || 'Something went wrong'}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
