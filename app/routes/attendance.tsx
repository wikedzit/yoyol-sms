import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export function loader(_args: LoaderFunctionArgs) {
  return redirect('/x/attendance');
}

export default function Attendance() {
  return null;
}
