import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { getDashboardOverviewData } from '@/lib/dashboard';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const overview = await getDashboardOverviewData();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('[dashboard-overview]', error);
    return NextResponse.json({ message: 'Unable to load dashboard data' }, { status: 500 });
  }
}

