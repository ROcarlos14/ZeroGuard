import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, Edit, UserX, X } from 'lucide-react';
import { usersAPI, sessionsAPI } from '../services/api';
import { getRoleBadgeClass, formatDate, timeAgo } from '../utils/helpers';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', email: '', password: '', role: 'USER', department: '' });

  const { data: usersData } = useQuery({ queryKey: ['users', search, roleFilter, deptFilter],
    queryFn: () => usersAPI.list({ search, role: roleFilter || undefined, department: deptFilter || undefined, limit: 50 }).then(r => r.data) });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? usersAPI.deactivate(id) : usersAPI.update(id, { isActive: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const terminateSession = useMutation({
    mutationFn: (sessionId: string) => sessionsAPI.terminate(sessionId),
    onSuccess: () => { if (selected) loadUserDetail(selected.id); },
  });

  const createUser = useMutation({
    mutationFn: () => usersAPI.create(newUserForm),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['users'] }); 
      setShowCreateModal(false); 
      setNewUserForm({ username: '', email: '', password: '', role: 'USER', department: '' }); 
    },
  });

  const loadUserDetail = async (id: string) => {
    const { data } = await usersAPI.get(id);
    setSelected(data.data);
  };

  const users = usersData?.data || [];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-subtitle">Manage user accounts, roles, and access</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Edit className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zg-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="input-field pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option><option value="ANALYST">Analyst</option>
          <option value="USER">User</option><option value="GUEST">Guest</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Departments</option>
          {['Engineering','Finance','HR','Operations','IT','Legal','Marketing','Executive','N/A'].map(d =>
            <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zg-border">
                <th className="text-left p-3 text-xs text-zg-muted font-medium">User</th>
                <th className="text-left p-3 text-xs text-zg-muted font-medium">Department</th>
                <th className="text-left p-3 text-xs text-zg-muted font-medium">Role</th>
                <th className="text-left p-3 text-xs text-zg-muted font-medium">Risk</th>
                <th className="text-left p-3 text-xs text-zg-muted font-medium">Status</th>
                <th className="text-left p-3 text-xs text-zg-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-zg-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zg-cyan/10 flex items-center justify-center text-zg-cyan font-bold text-xs">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-zg-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-zg-muted">{user.department}</td>
                  <td className="p-3"><span className={getRoleBadgeClass(user.role)}>{user.role}</span></td>
                  <td className="p-3">
                    <span className={`font-mono text-sm ${user.riskScore > 50 ? 'text-zg-crimson' : user.riskScore > 20 ? 'text-zg-amber' : 'text-zg-emerald'}`}>
                      {user.riskScore}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleActive.mutate({ id: user.id, isActive: user.isActive })}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${user.isActive ? 'bg-zg-emerald/10 text-zg-emerald hover:bg-zg-emerald/20' : 'bg-zg-crimson/10 text-zg-crimson hover:bg-zg-crimson/20'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => loadUserDetail(user.id)} className="p-1.5 rounded hover:bg-white/5 text-zg-muted hover:text-zg-cyan">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg bg-zg-surface h-full overflow-y-auto border-l border-zg-border p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-heading text-white">User Detail</h2>
              <button onClick={() => setSelected(null)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-zg-cyan/10 flex items-center justify-center text-zg-cyan text-xl font-bold">
                {selected.username[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{selected.username}</h3>
                <p className="text-sm text-zg-muted">{selected.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className={getRoleBadgeClass(selected.role)}>{selected.role}</span>
                  <span className="badge bg-zg-card text-zg-muted">{selected.department}</span>
                </div>
              </div>
            </div>

            {/* Risk gauge */}
            <div className="glass-card p-4 mb-4">
              <p className="text-xs text-zg-muted mb-2">Risk Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-zg-bg overflow-hidden">
                  <div className={`h-full rounded-full ${selected.riskScore > 70 ? 'bg-zg-crimson' : selected.riskScore > 40 ? 'bg-zg-amber' : 'bg-zg-emerald'}`}
                    style={{ width: `${selected.riskScore}%` }} />
                </div>
                <span className="text-lg font-mono font-bold text-white">{selected.riskScore}</span>
              </div>
            </div>

            {/* Devices */}
            <h4 className="text-sm font-semibold text-white mb-2">Devices ({selected.devices?.length || 0})</h4>
            <div className="space-y-2 mb-4">
              {(selected.devices || []).map((d: any) => (
                <div key={d.id} className="p-3 rounded-lg bg-zg-bg/50 text-xs">
                  <div className="flex justify-between"><span className="text-white font-medium">{d.name}</span>
                    <span className={d.isTrusted ? 'text-zg-emerald' : 'text-zg-crimson'}>{d.isTrusted ? 'Trusted' : 'Untrusted'}</span></div>
                  <p className="text-zg-muted mt-1">{d.operatingSystem} • Trust: {d.trustScore}/100</p>
                </div>
              ))}
            </div>

            {/* Sessions */}
            <h4 className="text-sm font-semibold text-white mb-2">Active Sessions ({selected.sessions?.length || 0})</h4>
            <div className="space-y-2 mb-4">
              {(selected.sessions || []).map((s: any) => (
                <div key={s.id} className="p-3 rounded-lg bg-zg-bg/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-white">{s.ipAddress}</p>
                    <p className="text-zg-muted">{timeAgo(s.lastActivityAt)}</p>
                  </div>
                  <button onClick={() => terminateSession.mutate(s.id)} className="text-zg-crimson hover:underline text-xs">
                    Terminate
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md bg-zg-surface rounded-xl border border-zg-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-heading text-white">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Username</label>
                <input type="text" className="input-field" value={newUserForm.username} onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })} placeholder="johndoe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Email</label>
                <input type="email" className="input-field" value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Password</label>
                <input type="password" className="input-field" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zg-muted mb-1">Role</label>
                  <select className="input-field" value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}>
                    <option value="USER">USER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="GUEST">GUEST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zg-muted mb-1">Department</label>
                  <input type="text" className="input-field" value={newUserForm.department} onChange={e => setNewUserForm({ ...newUserForm, department: e.target.value })} placeholder="Engineering" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 btn-ghost border border-zg-border">Cancel</button>
                <button onClick={() => createUser.mutate()} className="flex-1 btn-primary" disabled={createUser.isPending || !newUserForm.username || !newUserForm.email || !newUserForm.password || !newUserForm.department}>
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
              {createUser.isError && <p className="text-xs text-zg-crimson text-center">Failed to create user. Email or username might be taken.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
