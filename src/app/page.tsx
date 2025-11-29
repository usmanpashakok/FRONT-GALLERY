'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import AppGenerationModal from '@/components/AppGenerationModal';
import GalleryViewer from '@/components/GalleryViewer';

interface MediaFile {
    id: string;
    url: string;
    created_at: string;
    resource_type: 'image' | 'video';
    format?: string;
}

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [media, setMedia] = useState<MediaFile[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.uuid) {
            const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');

            newSocket.on('connect', () => {
                console.log('Connected to server');
                newSocket.emit('register_web', session.user.uuid);
            });

            newSocket.on('new_image', (image: MediaFile) => {
                setMedia(prev => [image, ...prev]);
            });

            setSocket(newSocket);

            fetchMedia();

            return () => {
                newSocket.disconnect();
            };
        }
    }, [session]);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/images?uuid=${session?.user?.uuid}`
            );
            const data = await res.json();
            setMedia(data);
        } catch (error) {
            console.error('Failed to fetch media:', error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-black border-b border-gray-800 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold gradient-text">Gallery Eye</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary px-4 py-2 rounded-lg"
                        >
                            Generate APK
                        </button>
                        <button
                            onClick={() => router.push('/api/auth/signout')}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : (
                    <GalleryViewer media={media} />
                )}
            </main>

            {/* APK Generation Modal */}
            {showModal && (
                <AppGenerationModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    uuid={session.user.uuid}
                    socket={socket}
                />
            )}
        </div>
    );
}
