"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react"

export default function Provider({ children, session }: { children: React.ReactNode, session?: any }) {
    useEffect(() => {
        // Disable Right Click
        const handleContext = (e: MouseEvent) => e.preventDefault();

        // Disable Inspection Keys
        const handleKeyDown = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') e.preventDefault();
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) e.preventDefault();
            if (e.ctrlKey && e.key === 'U') e.preventDefault();
        };

        document.addEventListener('contextmenu', handleContext);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContext);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return <SessionProvider session={session}>{children}</SessionProvider>
}
