import type { AttendanceStatus } from '../api/api-client'
import type { TranslationKey } from './translations'

export const attendanceStatusKeys: Record<AttendanceStatus, TranslationKey> = {
  registered: 'attendanceStatus.registered',
  checked_in: 'attendanceStatus.checkedIn',
  withdrawn: 'attendanceStatus.withdrawn',
}
