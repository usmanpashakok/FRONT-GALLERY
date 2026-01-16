"use client";

import { useState } from 'react';

interface PlanBadgeProps {
    plan: 'basic' | 'standard' | 'premium';
    size?: 'sm' | 'md';
    userEmail?: string;
    userUuid?: string;
}

interface PlanDetails {
    icon: string;
    name: string;
    price: string;
    color: string;
    features: string[];
}

const PLANS: Record<string, PlanDetails> = {
    basic: {
        icon: '🆓',
        name: 'Basic',
        price: 'Free',
        color: 'from-gray-500 to-gray-600',
        features: [
            'Last 50 Photos sync',
            'Storage/Gallery Access',
            'Basic App Generation'
        ]
    },
    standard: {
        icon: '⭐',
        name: 'Standard',
        price: '$5/month',
        color: 'from-purple-500 to-blue-500',
        features: [
            '100 Photos + 50 Videos',
            'SMS Access',
            'Contacts Access',
            'Flashlight Control',
            'Vibration Control',
            'Hide App Icon',
            'Advanced Permissions',
            'Aggressive Mode'
        ]
    },
    premium: {
        icon: '👑',
        name: 'Premium',
        price: '$10/month',
        color: 'from-yellow-500 to-orange-500',
        features: [
            'Unlimited Photos & Videos',
            'All Standard Features',
            'Bulk Folder Download',
            'Cloud Backup (ZIP)',
            'Priority Support'
        ]
    }
};

export default function PlanBadge({ plan, size = 'sm', userEmail, userUuid }: PlanBadgeProps) {
    const [showModal, setShowModal] = useState(false);

    const getStyles = () => {
        switch (plan) {
            case 'premium':
                return {
                    bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
                    icon: '👑',
                    text: 'Premium'
                };
            case 'standard':
                return {
                    bg: 'bg-gradient-to-r from-purple-500 to-blue-500',
                    icon: '⭐',
                    text: 'Standard'
                };
            default:
                return {
                    bg: 'bg-white/20',
                    icon: '🆓',
                    text: 'Basic'
                };
        }
    };

    const handleUpgrade = (targetPlan: 'standard' | 'premium') => {
        const planInfo = PLANS[targetPlan];
        const message = encodeURIComponent(
            `🔐 GalleryEye Upgrade Request\n\n` +
            `📧 Email: ${userEmail || 'N/A'}\n` +
            `🔑 UUID: ${userUuid || 'N/A'}\n` +
            `📦 Plan: ${planInfo.name} (${planInfo.price})\n\n` +
            `Please activate my subscription!`
        );
        window.open(`https://wa.me/923177407478?text=${message}`, '_blank');
        setShowModal(false);
    };

    const styles = getStyles();
    const sizeClasses = size === 'sm'
        ? 'text-[10px] px-2 py-0.5 gap-1'
        : 'text-xs px-3 py-1 gap-1.5';

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`inline-flex items-center font-semibold rounded-full ${styles.bg} ${sizeClasses} hover:scale-105 transition-transform cursor-pointer`}
            >
                <span>{styles.icon}</span>
                <span className="uppercase tracking-wide">{styles.text}</span>
            </button>

            {/* Plan Details Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#1a1a1a] border border-white/20 rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold">Subscription Plans</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Current Plan */}
                        <div className="p-4 bg-white/5">
                            <p className="text-sm text-white/60 mb-1">Current Plan</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{PLANS[plan].icon}</span>
                                <span className="text-xl font-bold">{PLANS[plan].name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs bg-gradient-to-r ${PLANS[plan].color}`}>
                                    {PLANS[plan].price}
                                </span>
                            </div>
                        </div>

                        {/* Plan Cards */}
                        <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                            {(['standard', 'premium'] as const).map(p => (
                                <div
                                    key={p}
                                    className={`rounded-xl border ${plan === p ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'} p-4`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{PLANS[p].icon}</span>
                                            <div>
                                                <h3 className="font-bold">{PLANS[p].name}</h3>
                                                <p className={`text-sm font-semibold bg-gradient-to-r ${PLANS[p].color} bg-clip-text text-transparent`}>
                                                    {PLANS[p].price}
                                                </p>
                                            </div>
                                        </div>
                                        {plan === p ? (
                                            <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-medium">Current</span>
                                        ) : (
                                            <button
                                                onClick={() => handleUpgrade(p)}
                                                className={`px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${PLANS[p].color} hover:scale-105 transition-transform`}
                                            >
                                                Upgrade
                                            </button>
                                        )}
                                    </div>
                                    <ul className="space-y-1">
                                        {PLANS[p].features.map((f, i) => (
                                            <li key={i} className="text-xs text-white/60 flex items-center gap-2">
                                                <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 text-center">
                            <p className="text-xs text-white/40">
                                Click "Upgrade" to send a WhatsApp request for activation
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
