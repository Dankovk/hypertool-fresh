import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PricingTable } from '@clerk/nextjs';
import { getRequiredPlanSlugs, hasRequiredPlan } from '@/lib/billing';
import './billing.css';

const BILLING_RETURN_URL = process.env.NEXT_PUBLIC_CLERK_BILLING_RETURN_URL ?? '/editor';

export default async function BillingPage() {
  const { userId, has } = await auth();

  if (!userId) {
    // Redirect to local sign-in page which redirects to Clerk Account Portal
    redirect('/sign-in');
  }

  const plansConfigured = getRequiredPlanSlugs();

  if (plansConfigured.length > 0 && hasRequiredPlan(has)) {
    redirect('/editor');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-text">
      <div className="w-full max-w-7xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold text-offwhite">Choose Your Plan</h1>
          <p className="text-base text-grey">
            Pick the subscription that fits your workflow. You can upgrade or downgrade at any time.
          </p>
        </div>
        <div className="billing-container">
          <PricingTable
            for="user"
            newSubscriptionRedirectUrl={BILLING_RETURN_URL}
            appearance={{
              variables: {
                colorPrimary: '#00ffd4',
                colorText: '#CECCCD',
                colorTextSecondary: '#908F91',
                colorBackground: '#1E1E22',
                colorInputBackground: '#25262A',
                colorInputText: '#CECCCD',
                borderRadius: '12px',
                fontFamily: 'var(--ht-base-font-family-sans)',
              },
              elements: {
                card: 'billing-card',
                cardButton: 'billing-card-button',
                badge: 'billing-badge',
              },
            }}
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="text-center text-grey">Loading plans…</div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

