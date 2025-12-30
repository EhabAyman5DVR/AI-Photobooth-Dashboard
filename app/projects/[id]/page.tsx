
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, UsageLog, UserRole, CloudinaryImage } from '@/types';
import { supabase } from '@/utils/supabase';
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
    Info,
    Loader2
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
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        dailyLimit: 0,
        cloudinaryTag: ''
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (!user || !id) return;
        fetchProjectData();
    }, [id, user]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        try {
            const { data: p, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!p) {
                router.push('/projects');
                return;
            }

            // Fallback for Cloudinary settings
            let finalCloudName = p.cloudinary_cloud_name;
            let finalApiKey = p.cloudinary_api_key;
            let finalApiSecret = p.cloudinary_api_secret;

            if (!finalCloudName) {
                const { data: globalSettings } = await supabase
                    .from('global_settings')
                    .select('*')
                    .eq('id', 'current')
                    .single();

                if (globalSettings) {
                    finalCloudName = globalSettings.cloudinary_cloud_name;
                    finalApiKey = globalSettings.cloudinary_api_key;
                    finalApiSecret = globalSettings.cloudinary_api_secret;
                }
            }

            const mapped: Project = {
                id: p.id,
                name: p.name,
                description: p.description || '',
                dailyLimit: p.max_usage || 0,
                currentGenerations: p.total_usage || 0,
                createdAt: p.created_at,
                ownerId: p.created_by || '',
                status: p.is_active ? ((p.total_usage || 0) >= (p.max_usage || 0) ? 'exhausted' : 'active') : 'paused',
                cloudinaryCloudName: finalCloudName,
                cloudinaryTag: p.cloudinary_tag,
                cloudinaryApiKey: finalApiKey,
                cloudinaryApiSecret: finalApiSecret
            };

            setProject(mapped);
            setEditForm({
                name: mapped.name,
                description: mapped.description,
                dailyLimit: mapped.dailyLimit,
                cloudinaryTag: mapped.cloudinaryTag || ''
            });

            // Fetch Logs
            const { data: logsData } = await supabase
                .from('usage_logs')
                .select('*')
                .eq('project_id', id)
                .order('timestamp', { ascending: false });

            setLogs((logsData || []).map(l => ({
                id: l.id,
                projectId: l.project_id,
                timestamp: l.timestamp,
                amount: l.amount
            })));

            if (mapped.cloudinaryTag) {
                fetchImages(mapped.cloudinaryTag, mapped, false);
            }
        } catch (err) {
            console.error('Error fetching project:', err);
            router.push('/projects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${project.name}"?\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', project.id);

            if (error) throw error;

            router.push('/projects');
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete project. Please try again.');
            setIsDeleting(false);
        }
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    name: editForm.name,
                    description: editForm.description,
                    max_usage: editForm.dailyLimit,
                    cloudinary_tag: editForm.cloudinaryTag
                })
                .eq('id', project.id);

            if (error) throw error;

            await fetchProjectData();
            setShowEditModal(false);
        } catch (err) {
            console.error('Update error:', err);
            alert('Failed to update project');
        }
    };

    const fetchImages = async (tag?: string, currentProject?: Project, append = false) => {
        const p = currentProject || project;
        if (!p) return;

        const activeTag = tag || p.cloudinaryTag || '';
        if (!activeTag) return;

        if (append) setLoadingMore(true);
        else setLoadingImages(true);

        try {
            // Simplified URL: The server-side API now fetches secrets from Supabase global_settings
            let url = `/api/cloudinary/images?tag=${encodeURIComponent(activeTag)}`;
            if (p.cloudinaryCloudName) {
                url += `&cloudName=${encodeURIComponent(p.cloudinaryCloudName)}`;
            }
            if (append && nextCursor) {
                url += `&next_cursor=${nextCursor}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (append) {
                    setImages(prev => [...prev, ...(data.resources || [])]);
                } else {
                    setImages(data.resources || []);
                }
                setNextCursor(data.next_cursor || null);
            } else {
                if (!append) setImages([]);
            }
        } catch (err) {
            console.error('Error fetching Cloudinary images:', err);
        } finally {
            setLoadingImages(false);
            setLoadingMore(false);
        }
    };

    const handleSimulateApiCall = async () => {
        if (!project || isSimulating) return;
        setIsSimulating(true);

        try {
            const amount = 1;

            // 1. Create a log entry
            const { error: logError } = await supabase
                .from('usage_logs')
                .insert([{ project_id: project.id, amount }]);

            if (logError) throw logError;

            // 2. Increment project total_usage
            const { error: updateError } = await supabase.rpc('increment_project_usage', {
                p_id: project.id,
                p_amount: amount
            });

            if (updateError) throw updateError;

            // Refresh UI
            await fetchProjectData();

        } catch (err) {
            console.error('Simulation error:', err);
            alert('Simulation failed. Did you create the increment_project_usage function?');
        } finally {
            setIsSimulating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading || !project || !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="text-slate-500 font-medium tracking-wide">Fetching project details...</p>
                </div>
            </div>
        );
    }

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
                            ID: {project.id} • <span className="text-indigo-600 font-medium">#{project.cloudinaryTag || 'No Tag'}</span>
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
                    {user.role === UserRole.ADMIN && (
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            API Logs
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className={`grid grid-cols-1 ${user.role === UserRole.ADMIN ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'} gap-8`}>
                    <div className={user.role === UserRole.ADMIN ? 'lg:col-span-2 space-y-8' : 'space-y-8'}>
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

                        {user.role === UserRole.ADMIN && (
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
                        )}
                    </div>

                    {user.role === UserRole.ADMIN && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Settings size={18} className="text-slate-400" />
                                    Project Settings
                                </h3>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Cloudinary Cloud</p>
                                    <p className="font-medium text-slate-700">{project.cloudinaryCloudName || 'Managed via Global Settings'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Tag / Folder Path</p>
                                    <p className="font-medium text-slate-700">{project.cloudinaryTag || 'Not set'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">API Security</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                                            SDK Protected
                                        </span>
                                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                            Supabase Secure
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleDeleteProject}
                                        disabled={isDeleting}
                                        className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium disabled:opacity-50"
                                    >
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        {isDeleting ? 'Deleting...' : 'Delete Project'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            onClick={() => fetchImages()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-bold transition-all"
                        >
                            <RefreshCw size={16} className={loadingImages ? 'animate-spin' : ''} />
                            Refresh Images
                        </button>
                    </div>

                    {!project.cloudinaryTag ? (
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
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {images.map(img => (
                                    <div key={img.public_id} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300">
                                        <img
                                            src={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/w_400,c_fill,g_auto/v${img.version}/${img.public_id}.${img.format}`}
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
                                                    href={`https://res.cloudinary.com/${project.cloudinaryCloudName || 'placeholder'}/image/upload/v${img.version}/${img.public_id}.${img.format}`}
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
                            {nextCursor && (
                                <div className="mt-12 flex justify-center">
                                    <button
                                        onClick={() => fetchImages(undefined, undefined, true)}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        {loadingMore ? <RefreshCw className="animate-spin" size={18} /> : null}
                                        {loadingMore ? 'Loading More...' : 'Load More Images'}
                                    </button>
                                </div>
                            )}
                        </>
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
                                    The dashboard now uses the <b>Cloudinary Node.js SDK</b> securely. Ensure you have provided your <b>API Key</b> and <b>Secret</b> in the global settings. No insecure "Resource List" settings are required on Cloudinary.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {user.role === UserRole.ADMIN && activeTab === 'logs' && (
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
            )
            }
            {
                showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white w-full max-w-xl rounded-2xl p-8 animate-in zoom-in-95 duration-200 my-8">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Edit Project</h2>
                            <form onSubmit={handleUpdateProject} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Basic Information</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                            <textarea
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                                            <input
                                                type="number"
                                                value={editForm.dailyLimit}
                                                onChange={e => setEditForm({ ...editForm, dailyLimit: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gallery Configuration</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Asset Tag/Folder</label>
                                            <input
                                                type="text"
                                                value={editForm.cloudinaryTag}
                                                onChange={e => setEditForm({ ...editForm, cloudinaryTag: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <p className="mt-2 text-[10px] text-slate-400 leading-relaxed italic">
                                                * Cloudinary Cloud Name and API credentials are now managed globally in Settings.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
