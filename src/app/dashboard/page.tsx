'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GalleryViewer from '@/components/GalleryViewer';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    if (!session) {
        return null;
    }

    // Assuming the session user object has the UUID. 
    // If not, we might need to fetch it or store it in the session.
    // For now, I'll assume session.user.uuid exists or use a fallback if testing.
    const userUuid = (session.user as any)?.uuid || 'test-uuid';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    return <GalleryViewer uuid={userUuid} backendUrl={backendUrl} />;
}
