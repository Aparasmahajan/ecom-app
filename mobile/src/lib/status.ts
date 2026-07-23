/**
 * Order-status pill colors — mirrors the web `.status-*` classes (CLAUDE.md §12.9).
 * Translucent color-tinted backgrounds matching the status semantics.
 */
import { colors } from '../theme';

export function statusStyle(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'CREATED':    return { bg: 'rgba(156,163,175,0.15)', fg: colors.muted };
    case 'PAID':       return { bg: 'rgba(245,200,66,0.15)',  fg: colors.accent };
    case 'PROCESSING': return { bg: 'rgba(245,200,66,0.15)',  fg: colors.accent };
    case 'SHIPPED':    return { bg: 'rgba(59,130,246,0.15)',  fg: '#60a5fa' };
    case 'DELIVERED':  return { bg: 'rgba(34,197,94,0.15)',   fg: '#4ade80' };
    case 'CANCELLED':  return { bg: 'rgba(239,68,68,0.15)',   fg: colors.danger };
    case 'REFUNDED':   return { bg: 'rgba(168,85,247,0.15)',  fg: '#c084fc' };
    default:           return { bg: 'rgba(156,163,175,0.15)', fg: colors.muted };
  }
}
