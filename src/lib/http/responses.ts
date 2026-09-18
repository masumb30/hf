import { NextResponse } from 'next/server';

export function ok<T>(data: T, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function created<T>(data: T, message = 'Created') {
  return NextResponse.json({ success: true, message, data }, { status: 201 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}
