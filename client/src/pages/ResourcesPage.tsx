import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Server, Globe, Wrench, FileText, Shield, Lock, CheckCircle, XCircle, HelpCircle, X, Plus, Loader2 } from 'lucide-react';
import { resourcesAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const typeIcons: Record<string, any> = { DATABASE: Database, FILE_SERVER: FileText, APPLICATION: Globe, API: Server, INTERNAL_TOOL: Wrench };
const sensitivityColors: Record<string, string> = { PUBLIC: 'bg-blue-500/10 text-blue-400', INTERNAL: 'bg-zg-emerald/10 text-zg-emerald', CONFIDENTIAL: 'bg-zg-amber/10 text-zg-amber', SECRET: 'bg-zg-crimson/10 text-zg-crimson' };

export default function ResourcesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const { data } = useQuery({ queryKey: ['resources'], queryFn: () => resourcesAPI.list().then(r => r.data.data) });

  const testAccess = useMutation({
    mutationFn: (resourceId: string) => resourcesAPI.testAccess(resourceId, { action: 'VIEW' }),
    onSuccess: (res) => setTestResult(res.data.data),
  });

  const resources = data || [];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Protected Resources</h1>
          <p className="page-subtitle">View and manage Zero Trust protected resources</p>
        </div>
        {user?.role === 'ADMIN' && <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Resource</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {resources.map((resource: any) => {
          const Icon = typeIcons[resource.type] || Globe;
          return (
            <motion.div key={resource.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-zg-cyan/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zg-cyan" />
                </div>
                <span className={`badge ${sensitivityColors[resource.sensitivityLevel]}`}>{resource.sensitivityLevel}</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{resource.name}</h3>
              <p className="text-xs text-zg-muted line-clamp-2 mb-3">{resource.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-zg-muted">Type</span><span className="text-zg-text">{resource.type.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-zg-muted">Min Trust</span><span className="text-zg-text">{resource.minTrustScore}</span></div>
                <div className="flex justify-between"><span className="text-zg-muted">Roles</span><span className="text-zg-text truncate ml-2">{resource.allowedRoles}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-zg-muted">MFA Required</span>
                  {resource.requiresMFA ? <Lock className="w-3.5 h-3.5 text-zg-amber" /> : <span className="text-zg-muted">No</span>}
                </div>
              </div>
              <button onClick={() => { setTesting(resource.id); testAccess.mutate(resource.id); }}
                className="w-full btn-primary mt-4 text-xs py-2 flex items-center justify-center gap-2">
                {testing === resource.id && testAccess.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                Test Access
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Test Access Result Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTestResult(null)}>
          <div className="glass-card w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-heading font-bold text-white">Access Check Result</h3>
              <button onClick={() => setTestResult(null)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className={`text-center py-4 rounded-lg mb-4 ${
              testResult.outcome === 'ALLOWED' ? 'bg-zg-emerald/10' : testResult.outcome === 'DENIED' ? 'bg-zg-crimson/10' : 'bg-zg-amber/10'
            }`}>
              {testResult.outcome === 'ALLOWED' ? <CheckCircle className="w-12 h-12 text-zg-emerald mx-auto" /> :
                testResult.outcome === 'DENIED' ? <XCircle className="w-12 h-12 text-zg-crimson mx-auto" /> :
                <HelpCircle className="w-12 h-12 text-zg-amber mx-auto" />}
              <p className={`text-xl font-bold mt-2 ${
                testResult.outcome === 'ALLOWED' ? 'text-zg-emerald' : testResult.outcome === 'DENIED' ? 'text-zg-crimson' : 'text-zg-amber'
              }`}>{testResult.outcome}</p>
              <p className="text-sm text-zg-muted mt-1">Risk Score: <span className="font-mono font-bold text-white">{testResult.riskScore}</span></p>
            </div>

            {testResult.reasons?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-zg-muted mb-2 uppercase">Reasons</h4>
                {testResult.reasons.map((r: string, i: number) => (
                  <p key={i} className="text-sm text-zg-text py-1">• {r}</p>
                ))}
              </div>
            )}

            <h4 className="text-xs font-semibold text-zg-muted mb-2 uppercase">Security Checks</h4>
            <div className="space-y-1.5">
              {(testResult.checksPerformed || []).map((check: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-zg-bg/50 text-xs">
                  {check.passed ? <CheckCircle className="w-4 h-4 text-zg-emerald shrink-0" /> : <XCircle className="w-4 h-4 text-zg-crimson shrink-0" />}
                  <span className="text-white font-medium">{check.checkName}</span>
                  <span className="text-zg-muted ml-auto truncate max-w-[200px]">{check.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
