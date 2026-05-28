export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'ADMIN': return 'badge-admin';
    case 'ANALYST': return 'badge-analyst';
    case 'USER': return 'badge-user';
    case 'GUEST': return 'badge-guest';
    default: return 'badge';
  }
}

export function getOutcomeBadgeClass(outcome: string) {
  switch (outcome) {
    case 'ALLOWED': return 'badge-allowed';
    case 'DENIED': return 'badge-denied';
    case 'CHALLENGED': return 'badge-challenged';
    default: return 'badge';
  }
}

export function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case 'LOW': return 'badge-low';
    case 'MEDIUM': return 'badge-medium';
    case 'HIGH': return 'badge-high';
    case 'CRITICAL': return 'badge-critical';
    default: return 'badge';
  }
}

export function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
