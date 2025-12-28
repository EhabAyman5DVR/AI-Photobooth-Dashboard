
import React, { useMemo } from 'react';
import { User, Project, UserRole } from '../types';
import { getStoreData } from '../store';
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

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const allProjects = getStoreData<Project[]>('pb_projects', []);
  const allUsers = getStoreData<User[]>('pb_users', []);
  
  const projects = useMemo(() => {
    if (user.role === UserRole.ADMIN) return allProjects;
    return allProjects.filter(p => user.assignedProjectIds.includes(p.id));
  }, [user, allProjects]);

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

  const chartData = [
    { name: 'Mon', count: 400 },
    { name: 'Tue', count: 300 },
    { name: 'Wed', count: 600 },
    { name: 'Thu', count: 800 },
    { name: 'Fri', count: 500 },
    { name: 'Sat', count: 900 },
    { name: 'Sun', count: 700 },
  ];

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
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
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
};

export default Dashboard;
