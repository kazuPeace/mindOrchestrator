import type { DocumentRecord } from './types'

export function hasDriveConflict(
  record: DocumentRecord,
  remoteModifiedTime?: string,
): boolean {
  if (!record.dirty || !record.driveModifiedTime || !remoteModifiedTime)
    return false
  return (
    new Date(remoteModifiedTime).getTime() >
    new Date(record.driveModifiedTime).getTime()
  )
}
