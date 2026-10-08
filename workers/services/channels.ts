import { and, desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { extensionSettings } from '../database/extension-registry';
import { financeAllocations, financeInvoices, financeLines } from '../database/finance';
import { guardians, guardianStudents } from '../database/guardians';
import { notifications } from '../database/notifications';
import { students } from '../database/students';
import { users } from '../database/users';
import {
  absenceNotice,
  deliveryReceipt,
  feeReminderNotice,
  preferredLanguage,
  receiptLine,
  refusalToQueueChannel,
  type ChannelName,
} from '../kernel/channels';
import { formatMoney } from '../kernel/locale-format';

type ChannelDeps = {
  canManage: () => Promise<boolean>;
};

export default class ChannelService {
  constructor(
    private db: AppDatabase,
    private deps: ChannelDeps,
  ) {}

  async receipts(schoolId: number, channel: ChannelName): Promise<string[]> {
    const rows = await this.db
      .select({
        recipient: notifications.recipient,
        title: notifications.title,
        status: notifications.status,
        detail: notifications.detail,
      })
      .from(notifications)
      .where(and(eq(notifications.schoolId, schoolId), eq(notifications.channel, channel)))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
    return rows.map((row) => receiptLine({
      recipient: row.recipient ?? '',
      title: row.title,
      status: row.status,
      detail: row.detail ?? '',
    }));
  }

  async remind(schoolId: number): Promise<{ error: string } | { ok: true }> {
    if (!(await this.deps.canManage())) {
      return { error: 'You do not have permission to send fee reminders.' };
    }
    const balances = await this.outstandingByStudent(schoolId);
    if (balances.length === 0) {
      return { error: 'Nobody has an outstanding balance.' };
    }
    let queued = 0;
    for (const balance of balances) {
      queued += await this.tellGuardians(schoolId, balance.studentId, (language) => feeReminderNotice({
        studentName: balance.studentName,
        amount: formatMoney(balance.outstandingMinor, balance.currency, language),
        language,
      }));
    }
    if (queued === 0) {
      return { error: 'Set a sender on the SMS or email plugin, and a guardian phone or email, before sending reminders.' };
    }
    return { ok: true };
  }

  async notifyAbsence(schoolId: number, studentId: number, date: string): Promise<void> {
    const student = await this.studentName(schoolId, studentId);
    if (!student) return;
    await this.tellGuardians(schoolId, studentId, (language) => absenceNotice({
      studentName: student,
      date,
      language,
    }));
  }

  private async tellGuardians(
    schoolId: number,
    studentId: number,
    message: (language: 'en' | 'sw') => { title: string; body: string },
  ): Promise<number> {
    const people = await this.db
      .select({
        phone: guardians.phone,
        email: guardians.email,
        userId: guardians.userId,
        language: users.preferredLanguage,
      })
      .from(guardianStudents)
      .innerJoin(guardians, eq(guardians.id, guardianStudents.guardianId))
      .leftJoin(users, eq(users.id, guardians.userId))
      .where(and(eq(guardianStudents.schoolId, schoolId), eq(guardianStudents.studentId, studentId)));

    let queued = 0;
    for (const person of people) {
      const language = preferredLanguage(person.language);
      const notice = message(language);
      if (person.phone) {
        const result = await this.queue(schoolId, 'sms', person.phone, notice, person.userId);
        if (result === 'queued') queued += 1;
      }
      if (person.email) {
        const result = await this.queue(schoolId, 'email', person.email, notice, person.userId);
        if (result === 'queued') queued += 1;
      }
    }
    return queued;
  }

  private async queue(
    schoolId: number,
    channel: ChannelName,
    recipient: string,
    notice: { title: string; body: string },
    userId: number | null,
  ): Promise<'queued' | 'skipped'> {
    const sender = await this.pluginSetting(schoolId, channel, 'sender');
    const gateway = await this.pluginSetting(schoolId, channel, 'gateway');
    const refusal = refusalToQueueChannel({ channel, sender, recipient });
    if (refusal) return 'skipped';
    const receipt = deliveryReceipt(channel, gateway);
    await this.db.insert(notifications).values({
      schoolId,
      userId,
      extensionKey: channel,
      channel,
      title: notice.title,
      body: notice.body,
      status: receipt.status,
      recipient: recipient.trim(),
      detail: receipt.detail,
      readAt: null,
      createdAt: Date.now(),
    });
    return 'queued';
  }

  private async outstandingByStudent(schoolId: number): Promise<{
    studentId: number;
    studentName: string;
    outstandingMinor: number;
    currency: string;
  }[]> {
    const invoices = await this.db
      .select({
        id: financeInvoices.id,
        studentId: financeInvoices.studentId,
        currency: financeInvoices.currency,
      })
      .from(financeInvoices)
      .where(and(eq(financeInvoices.schoolId, schoolId), eq(financeInvoices.voided, false)));

    const totals = new Map<number, { outstandingMinor: number; currency: string }>();
    for (const invoice of invoices) {
      const outstanding = await this.invoiceOutstanding(schoolId, invoice.id);
      if (outstanding <= 0) continue;
      const current = totals.get(invoice.studentId);
      totals.set(invoice.studentId, {
        outstandingMinor: (current?.outstandingMinor ?? 0) + outstanding,
        currency: invoice.currency,
      });
    }

    const balances: {
      studentId: number;
      studentName: string;
      outstandingMinor: number;
      currency: string;
    }[] = [];
    for (const [studentId, total] of totals) {
      const studentName = await this.studentName(schoolId, studentId);
      if (!studentName) continue;
      balances.push({ studentId, studentName, ...total });
    }
    return balances;
  }

  private async invoiceOutstanding(schoolId: number, invoiceId: number): Promise<number> {
    const lines = await this.db
      .select({ amountMinor: financeLines.amountMinor })
      .from(financeLines)
      .where(and(eq(financeLines.schoolId, schoolId), eq(financeLines.invoiceId, invoiceId)));
    const paid = await this.db
      .select({ amountMinor: financeAllocations.amountMinor })
      .from(financeAllocations)
      .where(and(eq(financeAllocations.schoolId, schoolId), eq(financeAllocations.invoiceId, invoiceId)));
    const billed = lines.reduce((sum, line) => sum + line.amountMinor, 0);
    const settled = paid.reduce((sum, line) => sum + line.amountMinor, 0);
    return billed - settled;
  }

  private async studentName(schoolId: number, studentId: number): Promise<string | null> {
    const student = await this.db
      .select({
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.id, studentId)))
      .get();
    if (!student) return null;
    return [student.firstName, student.middleName, student.lastName].filter((part) => part && part.trim()).join(' ');
  }

  private async pluginSetting(schoolId: number, extensionKey: string, settingKey: string): Promise<string> {
    const row = await this.db
      .select({ settingValue: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, extensionKey),
        eq(extensionSettings.settingKey, settingKey),
      ))
      .get();
    return row?.settingValue ?? '';
  }
}
