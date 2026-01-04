
'use client';

import React, { useMemo } from 'react';
import { Project, UserRole, UsageLog } from '@/types';
import { supabase } from '@/utils/supabase';
import {
    TrendingUp,
    FolderKanban,
    Users,
    Zap,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();

    const [allProjects, setAllProjects] = React.useState<Project[]>([]);
    const [allUsers, setAllUsers] = React.useState<any[]>([]);
    const [usageLogs, setUsageLogs] = React.useState<UsageLog[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Projects
            let projectsQuery = supabase.from('projects').select('*');

            if (user?.role !== UserRole.ADMIN) {
                const { data: memberProjects } = await supabase
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', user?.id);

                const memberIds = (memberProjects || []).map(m => m.project_id);
                projectsQuery = projectsQuery.or(`created_by.eq.${user?.id},id.in.(${memberIds.length ? memberIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
            }

            const { data: projectsData } = await projectsQuery;

            const mappedProjects: Project[] = (projectsData || []).map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                dailyLimit: p.max_usage || 0,
                currentGenerations: p.total_usage || 0,
                status: p.is_active ? ((p.total_usage || 0) >= (p.max_usage || 0) ? 'exhausted' : 'active') : 'paused',
                createdAt: p.created_at || '',
                ownerId: p.created_by || ''
            }));
            setAllProjects(mappedProjects);

            // 2. Fetch Profiles for Admin
            if (user?.role === UserRole.ADMIN) {
                const { data: profilesData } = await supabase.from('profiles').select('id');
                setAllUsers(profilesData || []);
            }

            // 3. Last 7 days usage
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            let logsQuery = supabase
                .from('usage_logs')
                .select('*')
                .gte('timestamp', sevenDaysAgo.toISOString());

            if (user?.role !== UserRole.ADMIN) {
                const projectIds = mappedProjects.map(p => p.id);
                if (projectIds.length > 0) {
                    logsQuery = logsQuery.in('project_id', projectIds);
                } else {
                    logsQuery = logsQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data: logsData } = await logsQuery;
            setUsageLogs((logsData || []).map(l => ({
                id: l.id,
                projectId: l.project_id,
                timestamp: l.timestamp,
                amount: l.amount
            })));

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const projects = allProjects;

    const stats = useMemo(() => {
        const totalGen = projects.reduce((acc, curr) => acc + curr.currentGenerations, 0);
        const totalLimit = projects.reduce((acc, curr) => acc + curr.dailyLimit, 0);
        const usagePercent = totalLimit > 0 ? (totalGen / totalLimit) * 100 : 0;

        return [
            {
                label: 'Active Projects',
                value: projects.length,
                icon: <FolderKanban className="text-indigo-600" />,
                trend: '+2',
                isUp: true,
                bgColor: 'bg-indigo-50'
            },
            {
                label: 'Total Generations',
                value: totalGen.toLocaleString(),
                icon: <Zap className="text-amber-600" />,
                trend: '+12%',
                isUp: true,
                bgColor: 'bg-amber-50'
            },
            {
                label: 'Capacity Usage',
                value: `${usagePercent.toFixed(1)}%`,
                icon: <TrendingUp className="text-emerald-600" />,
                trend: '-3%',
                isUp: false,
                bgColor: 'bg-emerald-50'
            },
            {
                label: 'Total Users',
                value: allUsers.length,
                icon: <Users className="text-blue-600" />,
                trend: '+0',
                isUp: true,
                bgColor: 'bg-blue-50'
            }
        ];
    }, [projects, allUsers]);

    const chartData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push({
                name: days[d.getDay()],
                dateStr: d.toISOString().split('T')[0],
                count: 0
            });
        }

        usageLogs.forEach(log => {
            const logDate = log.timestamp.split('T')[0];
            const dayEntry = last7Days.find(d => d.dateStr === logDate);
            if (dayEntry) {
                dayEntry.count += log.amount;
            }
        });

        return last7Days;
    }, [usageLogs]);

    if (!user) return null;
    if (isLoading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <Zap className="animate-pulse text-indigo-600" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">Loading dashboard data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                {stat.icon}
                            </div>
                            <div className={`flex items-center text-xs font-bold ${stat.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {stat.trend}
                                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Generations Activity</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Projects</h3>
                    <div className="space-y-4 flex-1">
                        {projects.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.currentGenerations} / {p.dailyLimit} gen</p>
                                    </div>
                                </div>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500"
                                        style={{ width: `${Math.min(100, (p.currentGenerations / p.dailyLimit) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <AlertCircle size={40} className="mb-2 opacity-20" />
                                <p>No projects found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
