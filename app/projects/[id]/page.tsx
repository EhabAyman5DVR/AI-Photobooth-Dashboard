
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, UsageLog, UserRole, CloudinaryImage } from '@/types';
import { getStoreData, setStoreData } from '@/store';
import {
    ArrowLeft,
    Settings,
    Trash2,
    Play,
    History,
    Copy,
    Check,
    Cpu,
    RefreshCw,
    Zap,
    Activity,
    Image as ImageIcon,
    ExternalLink,
    Download,
    Info
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function ProjectDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [images, setImages] = useState<CloudinaryImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'images' | 'logs'>('overview');
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (!user || !id) return;

        const projects = getStoreData<Project[]>('pb_projects', []);
        const found = projects.find(p => p.id === id);
        if (!found) {
            router.push('/projects');
            return;
        }

        if (user.role === UserRole.REGULAR && !user.assignedProjectIds.includes(found.id)) {
            router.push('/projects');
            return;
        }

        setProject(found);
        const allLogs = getStoreData<UsageLog[]>('pb_logs', []);
        setLogs(allLogs.filter(l => l.projectId === id).reverse());

        if (found.cloudinaryCloudName && found.cloudinaryTag) {
            fetchImages(found.cloudinaryCloudName, found.cloudinaryTag, found);
        }
    }, [id, user, router]);

    const fetchImages = async (cloudName: string, tag: string, currentProject?: Project) => {
        const p = currentProject || project;
        if (!p) return;

        setLoadingImages(true);
        try {
            let response;
            if (p.cloudinaryApiKey && p.cloudinaryApiSecret) {
                response = await fetch(`/api/cloudinary/images?cloudName=${cloudName}&tag=${tag}&apiKey=${p.cloudinaryApiKey}&apiSecret=${p.cloudinaryApiSecret}`);
            } else {
                response = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`);
            }

            if (response.ok) {
                const data = await response.json();
                setImages(data.resources || []);
            } else {
                setImages([]);
            }
        } catch (err) {
            console.error('Error fetching Cloudinary images:', err);
        } finally {
            setLoadingImages(false);
        }
    };

    const handleSimulateApiCall = () => {
        if (!project || isSimulating) return;
        setIsSimulating(true);

        setTimeout(() => {
            const amount = 1;
            const projects = getStoreData<Project[]>('pb_projects', []);
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    const newGen = p.currentGenerations + amount;
                    return {
                        ...p,
                        currentGenerations: newGen,
                        status: newGen >= p.dailyLimit ? 'exhausted' : p.status
                    };
                }
                return p;
            });

            const newLog: UsageLog = {
                id: `log-${Date.now()}`,
                projectId: project.id,
                timestamp: new Date().toISOString(),
                amount
            };

            const allLogs = getStoreData<UsageLog[]>('pb_logs', []);
            const updatedLogs = [newLog, ...allLogs];

            setStoreData('pb_projects', updatedProjects);
            setStoreData('pb_logs', updatedLogs);

            const latestProject = updatedProjects.find(p => p.id === id) || null;
            setProject(latestProject);
            setLogs(updatedLogs.filter(l => l.projectId === id).reverse());
            setIsSimulating(false);

            if (latestProject?.cloudinaryCloudName && latestProject?.cloudinaryTag) {
                fetchImages(latestProject.cloudinaryCloudName, latestProject.cloudinaryTag, latestProject);
            }
        }, 800);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!project || !user) return null;

    const usagePercent = (project.currentGenerations / project.dailyLimit) * 100;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/projects')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
                        <p className="text-slate-500 text-sm flex items-center gap-2">
                            ID: {project.id} • <span className="text-indigo-600 font-medium">{project.cloudinaryTag || 'No Cloudinary Tag'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'images' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Generated Images
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        API Logs
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Zap size={120} />
                            </div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Real-time Usage</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-800">{project.currentGenerations}</span>
                                        <span className="text-slate-400 font-medium">/ {project.dailyLimit} images</span>
                                    </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {project.status}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                                            }`}
                                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">{Math.floor(usagePercent)}% capacity used</span>
                                    <span className="text-slate-800 font-bold">{project.dailyLimit - project.currentGenerations} remaining</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-slate-200">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                        <Cpu size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">API Integration</h3>
                                </div>
                                <button
                                    onClick={handleSimulateApiCall}
                                    disabled={isSimulating || project.status === 'exhausted'}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isSimulating || project.status === 'exhausted'
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-white text-slate-900 hover:bg-indigo-50 active:scale-95 shadow-lg shadow-white/10'
                                        }`}
                                >
                                    {isSimulating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                    {isSimulating ? 'Sending Request...' : 'Simulate API Call'}
                                </button>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm">
                                Use the endpoint below to increment image generation counts. Every request updates Cloudinary project usage.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Endpoint URL</label>
                                    <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                                        <code className="text-indigo-400 text-sm flex-1 truncate">
                                            {origin}/api/projects/{project.id}/generate
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(`${origin}/api/projects/${project.id}/generate`)}
                                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                                        >
                                            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Settings size={18} className="text-slate-400" />
                            Project Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Cloudinary Cloud</p>
                                <p className="font-medium text-slate-700">{project.cloudinaryCloudName || 'Not set'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Cloudinary Tag</p>
                                <p className="font-medium text-slate-700">{project.cloudinaryTag || 'Not set'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">API Key</p>
                                <p className="font-medium text-slate-700">{project.cloudinaryApiKey ? '••••••••' + project.cloudinaryApiKey.slice(-4) : 'Not set'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">API Secret</p>
                                <p className="font-medium text-slate-700">{project.cloudinaryApiSecret ? '••••••••••••' : 'Not set'}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <button className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium">
                                    <Trash2 size={16} />
                                    Archive Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'images' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[500px]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon className="text-indigo-500" />
                                Cloudinary Asset Gallery
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Showing images from Cloudinary with tag <span className="font-bold text-indigo-600">"{project.cloudinaryTag}"</span>
                            </p>
                        </div>
                        <button
                            onClick={() => project.cloudinaryCloudName && project.cloudinaryTag && fetchImages(project.cloudinaryCloudName, project.cloudinaryTag)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-bold transition-all"
                        >
                            <RefreshCw size={16} className={loadingImages ? 'animate-spin' : ''} />
                            Sync Gallery
                        </button>
                    </div>

                    {!project.cloudinaryCloudName || !project.cloudinaryTag ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                                <Info size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">Cloudinary Not Configured</h4>
                            <p className="text-slate-500 max-w-sm mt-2">
                                Please set a Cloud Name and Tag in the project settings to fetch generated images from your Cloudinary account.
                            </p>
                        </div>
                    ) : loadingImages ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                <div key={n} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {images.map(img => (
                                <div key={img.public_id} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300">
                                    <img
                                        src={`https://res.cloudinary.com/${project.cloudinaryCloudName}/image/upload/w_400,c_fill,g_auto/v${img.version}/${img.public_id}.${img.format}`}
                                        alt={img.public_id}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                        <p className="text-white text-xs font-bold truncate">{img.public_id}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors">
                                                <Download size={14} />
                                            </button>
                                            <a
                                                href={`https://res.cloudinary.com/${project.cloudinaryCloudName}/image/upload/v${img.version}/${img.public_id}.${img.format}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                <ImageIcon size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">No Images Found</h4>
                            <p className="text-slate-500 max-w-sm mt-2">
                                We couldn't find any images for the tag <span className="font-bold">"{project.cloudinaryTag}"</span>. Make sure your photobooth is uploading assets to Cloudinary.
                            </p>
                            <div className="mt-6 p-4 bg-indigo-50 rounded-xl text-left">
                                <p className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                                    <Info size={14} /> Tip for developers
                                </p>
                                <p className="text-xs text-indigo-900 leading-relaxed">
                                    To enable client-side image listing, go to <b>Settings &gt; Security</b> in your Cloudinary Dashboard and enable <b>"Resource List"</b>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <History className="text-indigo-500" />
                            API Access Logs
                        </h3>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                            Real-time feed
                        </span>
                    </div>
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                                        <Zap size={18} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Image Generation Increment (+{log.amount})</p>
                                        <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()} • Successful Request</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                        HTTP 200 OK
                                    </span>
                                    <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                                    <span className="text-[10px] text-slate-400 font-mono hidden md:block">
                                        ref: {log.id.split('-')[1]}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <Activity size={48} className="opacity-20 mb-4" />
                                <p className="font-medium">No activity detected for this project yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
