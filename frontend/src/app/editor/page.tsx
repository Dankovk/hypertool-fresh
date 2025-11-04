import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import EditorClient from './EditorClient';
import { hasRequiredPlan, getRequiredPlanSlugs } from '@/lib/billing';

export default async function EditorPage() {
  const { userId, has } = await auth();

  if (!userId) {
    // Redirect to local sign-in page which redirects to Clerk Account Portal
    redirect('/sign-in');
  }

  const plansConfigured = getRequiredPlanSlugs();
  if (plansConfigured.length > 0 && !hasRequiredPlan(has)) {
    redirect('/editor');
  }

  return <EditorClient />;
}
