import { definePlugin } from '../../workers/kernel/sdk';
import source from './yoyol.extension.json';

const absenceAlerts = definePlugin({
  manifest: source,
  async handleEvent(event, context) {
    if (event.name !== 'attendance.record.marked_absent') return;
    const payload = event.payload;
    if (!payload || typeof payload !== 'object') return;
    const record = payload as { studentId?: unknown; attendanceDate?: unknown };
    if (typeof record.studentId !== 'number' || typeof record.attendanceDate !== 'string') return;
    await context.channels?.notifyAbsence(record.studentId, record.attendanceDate);
  },
});

export default absenceAlerts;
