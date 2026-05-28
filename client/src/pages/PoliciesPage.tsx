import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ToggleLeft, ToggleRight, Trash2, Edit } from 'lucide-react';
import { policiesAPI } from '../services/api';

const FIELDS = ['role', 'department', 'resourceSensitivity', 'deviceTrusted', 'riskScore', 'timeOfDay', 'ipAddress'];
const OPERATORS = ['is', 'is_not', 'greater_than', 'less_than', 'contains'];
const ACTIONS = ['ALLOW', 'DENY', 'REQUIRE_MFA', 'ALERT'];
const actionColors: Record<string, string> = { ALLOW: 'bg-zg-emerald/10 text-zg-emerald', DENY: 'bg-zg-crimson/10 text-zg-crimson', REQUIRE_MFA: 'bg-zg-amber/10 text-zg-amber', ALERT: 'bg-zg-purple/10 text-zg-purple' };

export default function PoliciesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', conditions: [{ field: 'role', operator: 'is', value: '' }], action: 'DENY', priority: 50 });

  const { data } = useQuery({ queryKey: ['policies'], queryFn: () => policiesAPI.list().then(r => r.data.data) });

  const toggle = useMutation({
    mutationFn: (id: string) => policiesAPI.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => policiesAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  const create = useMutation({
    mutationFn: () => policiesAPI.create({
      name: form.name, description: form.description,
      condition: JSON.stringify(form.conditions),
      action: form.action, priority: form.priority,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); setShowForm(false); },
  });

  const policies = data || [];

  const addCondition = () => setForm({ ...form, conditions: [...form.conditions, { field: 'role', operator: 'is', value: '' }] });
  const removeCondition = (i: number) => setForm({ ...form, conditions: form.conditions.filter((_, idx) => idx !== i) });
  const updateCondition = (i: number, field: string, value: string) => {
    const c = [...form.conditions]; (c[i] as any)[field] = value; setForm({ ...form, conditions: c });
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Policy Management</h1><p className="page-subtitle">Configure Zero Trust access policies</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Rule</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zg-border">
              {['Priority', 'Name', 'Condition', 'Action', 'Status', 'Actions'].map(h =>
                <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {policies.map((p: any) => {
              let condSummary = '';
              try { const c = JSON.parse(p.condition); condSummary = (Array.isArray(c) ? c : [c]).map((x: any) => `${x.field} ${x.operator} ${x.value}`).join(' AND '); } catch { condSummary = p.condition; }
              return (
                <tr key={p.id} className="border-b border-zg-border/50 hover:bg-white/[0.02]">
                  <td className="p-3 font-mono text-zg-cyan">{p.priority}</td>
                  <td className="p-3"><p className="text-white font-medium">{p.name}</p><p className="text-xs text-zg-muted">{p.description}</p></td>
                  <td className="p-3 text-xs text-zg-muted max-w-[200px] truncate">{condSummary}</td>
                  <td className="p-3"><span className={`badge ${actionColors[p.action] || ''}`}>{p.action}</span></td>
                  <td className="p-3">
                    <button onClick={() => toggle.mutate(p.id)} className="text-zg-muted hover:text-white">
                      {p.isActive ? <ToggleRight className="w-6 h-6 text-zg-emerald" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => remove.mutate(p.id)} className="p-1.5 text-zg-muted hover:text-zg-crimson"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Rule Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="glass-card w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-white">New Policy Rule</h3>
              <button onClick={() => setShowForm(false)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Rule name" />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Description" />
              <div>
                <label className="text-xs text-zg-muted block mb-1">Conditions</label>
                {form.conditions.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)} className="input-field w-auto text-xs">
                      {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={c.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} className="input-field w-auto text-xs">
                      {OPERATORS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                    </select>
                    <input value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} className="input-field text-xs" placeholder="Value" />
                    <button onClick={() => removeCondition(i)} className="text-zg-crimson"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={addCondition} className="text-xs text-zg-cyan hover:underline">+ Add condition</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zg-muted block mb-1">Action</label>
                  <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="input-field">
                    {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zg-muted block mb-1">Priority</label>
                  <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="input-field" />
                </div>
              </div>
              <button onClick={() => create.mutate()} className="w-full btn-primary">Create Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
