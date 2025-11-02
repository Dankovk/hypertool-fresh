import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRequiredPlanSlugs, hasRequiredPlan } from '@/lib/billing';

export async function GET() {
  const authResult = await auth();
  const { userId, has } = authResult;

  if (!userId) {
    return NextResponse.json(
      { isAuthenticated: false, hasRequiredPlan: false },
      { status: 401 },
    );
  }

  const planSlugs = getRequiredPlanSlugs();
  const entitled = hasRequiredPlan(has);

  return NextResponse.json({
    isAuthenticated: true,
    hasRequiredPlan: planSlugs.length === 0 ? true : entitled,
  });
}

