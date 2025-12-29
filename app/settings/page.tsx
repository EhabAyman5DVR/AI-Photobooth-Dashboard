
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { UserRole, GlobalSettings } from '@/types';
import { getStoreData, setStoreData } from '@/store';
import { Save, Cloud, ShieldCheck, Key } from 'lucide-react';

export default function SettingsPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState<GlobalSettings>({
        cloudinaryCloudName: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
            router.replace('/');
            return;
        }

        const currentSettings = getStoreData<GlobalSettings>('pb_settings', {
            cloudinaryCloudName: '',
            cloudinaryApiKey: '',
            cloudinaryApiSecret: ''
        });
        setSettings(currentSettings);
    }, [isAuthenticated, user, router]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);

        // Simulate API delay
        setTimeout(() => {
            setStoreData('pb_settings', settings);
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 800);
    };

    if (!user || user.role !== UserRole.ADMIN) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Global Settings</h2>
                <p className="text-slate-500">Manage platform-wide configurations and secure credentials.</p>
            </div>

            <div className="max-w-4xl">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                    <Cloud size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Cloudinary Infrastructure</h3>
                                    <p className="text-xs text-slate-500">Global credentials used by all projects.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                <ShieldCheck size={12} />
                                Super Admin Only
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Cloud Name</label>
                                        <input
                                            type="text"
                                            value={settings.cloudinaryCloudName}
                                            onChange={e => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="Your Cloudinary cloud name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">API Key</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Key size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={settings.cloudinaryApiKey}
                                                onChange={e => setSettings({ ...settings, cloudinaryApiKey: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                placeholder="Cloudinary API Key"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">API Secret</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <input
                                                type="password"
                                                value={settings.cloudinaryApiSecret}
                                                onChange={e => setSettings({ ...settings, cloudinaryApiSecret: e.target.value })}
                                                className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-mono"
                                                placeholder="••••••••••••••••"
                                                required
                                            />
                                        </div>
                                        <p className="mt-2 text-[10px] text-slate-400 italic">
                                            * Secrets are stored locally in your browser storage.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
                            {saveSuccess && (
                                <p className="text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-right-2">
                                    Settings saved successfully!
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`
                                    flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg
                                    ${isSaving
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'}
                                `}
                            >
                                <Save size={20} />
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">Security Notice</h4>
                        <p className="text-sm text-amber-800 leading-relaxed mt-1">
                            These settings control the connection to your Cloudinary assets platform-wide. Only the Super Admin account has access to this view. For production environments, consider moving these to server-side environment variables.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
