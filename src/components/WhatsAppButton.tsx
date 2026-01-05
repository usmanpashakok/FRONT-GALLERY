"use client";

import React, { useState } from 'react';
import VideoModal from './VideoModal';

const WhatsAppButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    const phoneNumber = "923460257488";
    const message = "Hello, I need help with GalleryEye.";
    const directUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const groupUrl = "https://chat.whatsapp.com/Bjq8gDaLgYC6xGBZWN9eBg";

    return (
        <>
            {/* WhatsApp FAB Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:shadow-xl cursor-pointer"
                title="Contact on WhatsApp"
            >
                <svg
                    viewBox="0 0 24 24"
                    width="32"
                    height="32"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </button>

            {/* Options Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#1a1a1a] border-t md:border border-white/20 w-full md:w-80 md:rounded-2xl shadow-2xl animate-slideUp">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold">Contact Us</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {/* Join Group Option */}
                            <a
                                href={groupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-12 bg-[#25D366]/20 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold">Join Community Group</div>
                                    <div className="text-xs text-white/50">Get updates & chat with others</div>
                                </div>
                            </a>

                            {/* Tutorial Video Option */}
                            <VideoModal videoId="0xQaikNVyn0" variant="button" />

                            {/* Direct Contact Option */}
                            <a
                                href={directUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold">Direct Support</div>
                                    <div className="text-xs text-white/50">Chat privately with support</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WhatsAppButton;

