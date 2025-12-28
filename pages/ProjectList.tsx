
import React, { useState, useMemo } from 'react';
import { User, Project, UserRole } from '../types';
import { getStoreData, setStoreData } from '../store';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ProjectListProps {
  user: User;
}

const ProjectList: React.FC<ProjectListProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    dailyLimit: 1000,
    ownerId: '',
    cloudinaryCloudName: '',
    cloudinaryTag: ''
  });

  const [projects, setProjects] = useState<Project[]>(getStoreData('pb_projects', []));
  const users = getStoreData<User[]>('pb_users', []);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (user.role === UserRole.REGULAR) {
      result = projects.filter(p => user.assignedProjectIds.includes(p.id));
    }
    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [projects, user, searchTerm]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `p-${Date.now()}`;
    const project: Project = {
      ...newProject,
      id,
      currentGenerations: 0,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    const updatedProjects = [...projects, project];
    setProjects(updatedProjects);
    setStoreData('pb_projects', updatedProjects);

    // If assigned to a user, update user's assigned projects
    if (newProject.ownerId) {
      const allUsers = getStoreData<User[]>('pb_users', []);
      const updatedUsers = allUsers.map(u => {
        if (u.id === newProject.ownerId) {
          return { ...u, assignedProjectIds: [...u.assignedProjectIds, id] };
        }
        return u;
      });
      setStoreData('pb_users', updatedUsers);
    }

    setShowModal(false);
    setNewProject({ name: '', description: '', dailyLimit: 1000, ownerId: '', cloudinaryCloudName: '', cloudinaryTag: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        
        {user.role === UserRole.ADMIN && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            Create Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Link 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {project.status}
              </span>
              <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600">{project.name}</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2">{project.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400 flex items-center gap-1">
                  <ImageIcon size={14} /> Usage
                </span>
                <span className="text-slate-800">{project.currentGenerations} / {project.dailyLimit}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    (project.currentGenerations / project.dailyLimit) > 0.9 ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (project.currentGenerations / project.dailyLimit) * 100)}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl p-8 animate-in zoom-in-95 duration-200 my-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Basic Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                    <input 
                      required
                      type="text" 
                      value={newProject.name}
                      onChange={e => setNewProject({...newProject, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="e.g. Summer Music Fest"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea 
                      value={newProject.description}
                      onChange={e => setNewProject({...newProject, description: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="Tell us about this project..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                    <input 
                      type="number" 
                      value={newProject.dailyLimit}
                      onChange={e => setNewProject({...newProject, dailyLimit: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cloudinary Setup</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cloud Name</label>
                    <input 
                      type="text" 
                      value={newProject.cloudinaryCloudName}
                      onChange={e => setNewProject({...newProject, cloudinaryCloudName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="e.g. photobooth-app"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Asset Tag/Folder</label>
                    <input 
                      type="text" 
                      value={newProject.cloudinaryTag}
                      onChange={e => setNewProject({...newProject, cloudinaryTag: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="e.g. event-2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign to User</label>
                    <select
                      value={newProject.ownerId}
                      onChange={e => setNewProject({...newProject, ownerId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Don't assign yet</option>
                      {users.filter(u => u.role === UserRole.REGULAR).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
