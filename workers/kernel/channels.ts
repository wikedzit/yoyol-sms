export type ChannelName = 'sms' | 'email';

export type ChannelReceipt = {
  status: 'not_sent';
  detail: string;
};

export function preferredLanguage(value: string | null | undefined): 'en' | 'sw' {
  return value === 'sw' ? 'sw' : 'en';
}

export function refusalToQueueChannel(input: {
  channel: ChannelName;
  sender: string;
  recipient: string;
}): string | null {
  if (input.sender.trim().length === 0) {
    return input.channel === 'sms'
      ? 'Set the SMS sender before a message can be recorded.'
      : 'Set the email sender before a message can be recorded.';
  }
  const recipient = input.recipient.trim();
  if (input.channel === 'sms' && !/^[0-9+][0-9 ]{8,}$/.test(recipient)) {
    return 'Enter a phone number.';
  }
  if (input.channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return 'Enter an email address.';
  }
  return null;
}

// A saved gateway address is not a live provider. The receipt stays not_sent
// until a real SMS or email binding exists.
export function deliveryReceipt(channel: ChannelName, gateway: string): ChannelReceipt {
  const name = channel === 'sms' ? 'SMS' : 'email';
  if (gateway.trim().length === 0) {
    return {
      status: 'not_sent',
      detail: `No ${name} gateway is configured, so this message was not sent.`,
    };
  }
  return {
    status: 'not_sent',
    detail: `The ${name} gateway address is saved. This server does not place the call, so the message was not sent.`,
  };
}

export function absenceNotice(input: {
  studentName: string;
  date: string;
  language: 'en' | 'sw';
}): { title: string; body: string } {
  if (input.language === 'sw') {
    return {
      title: 'Hayupo',
      body: `${input.studentName} hakuwepo tarehe ${input.date}.`,
    };
  }
  return {
    title: 'Absent',
    body: `${input.studentName} was marked absent on ${input.date}.`,
  };
}

export function feeReminderNotice(input: {
  studentName: string;
  amount: string;
  language: 'en' | 'sw';
}): { title: string; body: string } {
  if (input.language === 'sw') {
    return {
      title: 'Kumbusho la ada',
      body: `${input.studentName} bado analipa ${input.amount}.`,
    };
  }
  return {
    title: 'Fee reminder',
    body: `${input.studentName} has ${input.amount} still to pay.`,
  };
}

export function receiptLine(input: {
  recipient: string;
  title: string;
  status: string;
  detail: string;
}): string {
  return `${input.recipient}: ${input.title}. ${input.status}. ${input.detail}`;
}
