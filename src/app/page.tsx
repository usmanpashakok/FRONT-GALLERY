'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface GalleryImage {
    id: string;
    url: string;
    created_at: string;
}

export default function Home() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);

    // REPLACE WITH YOUR RENDER BACKEND URL
    const API_URL = 'http://localhost:3000';

    useEffect(() => {
        fetch(`${API_URL}/images`)
            .then((res) => res.json())
            .then((data) => {
                setImages(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch images', err);
                setLoading(false);
            });
    }, []);

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                    Gallery Eye
                </h1>
                <p className="text-gray-400 text-lg">Your memories, synced instantly.</p>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {images.map((image) => (
                        <div key={image.id} className="relative group overflow-hidden rounded-xl shadow-lg border border-gray-800 bg-gray-800">
                            <div className="aspect-square relative w-full">
                                <Image
                                    src={image.url}
                                    alt="Gallery Image"
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-end p-4">
                                <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                                    {new Date(image.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && !loading && (
                <div className="text-center text-gray-500 mt-20">
                    <p>No images found. Start uploading from your Android device!</p>
                </div>
            )}
        </main>
    );
}
