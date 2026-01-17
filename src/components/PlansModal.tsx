"use client";

import { useState } from "react";

interface PlansModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan: 'basic' | 'standard' | 'premium';
    userEmail: string;
    userUuid: string;
}

export default function PlansModal({ isOpen, onClose, currentPlan, userEmail, userUuid }: PlansModalProps) {
    if (!isOpen) return null;

    const generateWhatsAppLink = (planName: string, price: string) => {
        const message = `Hello, I want to upgrade to ${planName} Plan (${price}).\n\nMy Email: ${userEmail}\nMy UUID: ${userUuid}`;
        return `https://wa.me/923177407478?text=${encodeURIComponent(message)}`;
    };

    const getNextPlan = () => {
        if (currentPlan === 'basic') return 'standard';
        if (currentPlan === 'standard') return 'premium';
        return null;
    };

    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 'Free',
            icon: '🌱',
            color: 'from-gray-700 to-gray-800',
            features: [
                '50 Photos Sync',
                'Basic Gallery',
                'Limited Permissions'
            ]
        },
        {
            id: 'standard',
            name: 'Standard',
            price: '$5',
            icon: '⚡',
            color: 'from-blue-600 to-indigo-600',
            features: [
                '200 Photos Sync',
                'SMS & Contacts Access',
                'Hide App Icon',
                'Flashlight & Vibration'
            ]
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '$10',
            icon: '👑',
            color: 'from-yellow-500 to-orange-600',
            features: [
                'Unlimited All & ZIP Download',
                'Cloud Backup & Priority Support',
                'Stealth Mode++ (Undetectable)',
                'All Features Unlocked'
            ],
            popular: true
        }
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn sm:p-4">
            {/* Mobile Bottom Sheet / Desktop Modal */}
            <div className="relative w-full md:max-w-4xl h-[90vh] md:h-auto md:max-h-[90vh] bg-[#0f0f0f] border-t md:border border-white/10 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp">

                {/* Header */}
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#0f0f0f]/95 backdrop-blur z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Manage Plan</h2>
                        <p className="text-sm text-white/50">Current Status: <span className="text-white font-medium capitalize">{currentPlan}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">

                    {plans.map((plan) => {
                        const isActive = currentPlan === plan.id;
                        const isUpgrade = !isActive && (
                            (currentPlan === 'basic' && (plan.id === 'standard' || plan.id === 'premium')) ||
                            (currentPlan === 'standard' && plan.id === 'premium')
                        );

                        // Mobile: If basic, show basic (small) and upgrades (big).
                        // If standard, show standard (small/active) and premium (big).

                        return (
                            <div
                                key={plan.id}
                                className={`relative group rounded-3xl p-1 transition-all duration-300 ${isActive
                                        ? 'order-1 md:order-none'
                                        : isUpgrade
                                            ? 'order-2 md:order-none scale-100'
                                            : 'order-3 md:order-none opacity-50 contrast-75 grayscale'
                                    }`}
                            >
                                {/* Active Badge */}
                                {isActive && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-black/80 border border-green-500/50 text-green-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-green-900/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        CURRENTLY ACTIVE
                                    </div>
                                )}

                                {/* Popular/Upgrade Badge for Premium */}
                                {plan.popular && !isActive && (
                                    <div className="absolute -top-3 right-4 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-orange-500/20">
                                        REST RECOMMENDED
                                    </div>
                                )}

                                {/* Card Border */}
                                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${isActive ? 'from-green-500/50 to-green-900/10' :
                                        plan.id === 'premium' ? 'from-yellow-500 to-orange-600' :
                                            plan.id === 'standard' ? 'from-blue-500 to-indigo-600' :
                                                'from-white/10 to-transparent'
                                    } opacity-${isActive ? '100' : '40 group-hover:opacity-100'} transition-opacity`} />

                                {/* Card Content */}
                                <div className="relative h-full bg-[#131313] rounded-[1.4rem] p-5 flex flex-col">

                                    {/* Icon & Name */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="text-3xl mb-2">{plan.icon}</div>
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">{plan.price}</div>
                                            <div className="text-[10px] text-white/40 uppercase tracking-wider">Lifetime</div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-3 mb-6 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                                                <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-green-500' :
                                                        plan.id === 'premium' ? 'text-yellow-500' :
                                                            plan.id === 'standard' ? 'text-blue-500' : 'text-white/30'
                                                    }`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                <span className={feature.includes('Unlimited') || feature.includes('ZIP') ? 'text-white font-medium' : ''}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Action Button */}
                                    <div className="mt-auto">
                                        {isActive ? (
                                            <div className="w-full py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                Plan Active
                                            </div>
                                        ) : isUpgrade ? (
                                            <a
                                                href={generateWhatsAppLink(plan.name, plan.price)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${plan.id === 'premium'
                                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-black shadow-orange-900/20'
                                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-900/20'
                                                    }`}
                                            >
                                                Upgrade to {plan.name}
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                                            </a>
                                        ) : (
                                            <button disabled className="w-full py-3 rounded-xl bg-white/5 text-white/20 text-sm font-semibold cursor-not-allowed">
                                                Included
                                            </button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
