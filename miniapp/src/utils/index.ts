import { STATIC_BASE } from '../config'

/**
 * 将后端返回的相对路径（如 /uploads/xxx）补全为完整URL
 * 小程序不支持相对路径，必须用完整域名
 */
export function toAbsUrl(path: string | undefined | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${STATIC_BASE}${path}`
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date | undefined, fmt = 'YYYY-MM-DD HH:mm'): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
}

/**
 * 赛事状态映射
 */
export const tournamentStatusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: '#999' },
  registration: { text: '报名中', color: '#4caf50' },
  bracket: { text: '对阵生成中', color: '#2196f3' },
  in_progress: { text: '进行中', color: '#ff9800' },
  completed: { text: '已结束', color: '#666' },
  cancelled: { text: '已取消', color: '#f44336' },
}

/**
 * 赛制文本映射
 */
export const formatTextMap: Record<string, string> = {
  single_elimination: '单淘汰',
  double_elimination: '双淘汰',
  round_robin: '循环赛',
}

export function formatText(format: string): string {
  return formatTextMap[format] || format || '未知'
}

/**
 * 参赛类型映射
 */
export const participantTypeMap: Record<string, string> = {
  individual: '个人赛',
  team: '团队赛',
}
