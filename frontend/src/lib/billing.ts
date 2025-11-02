export function getRequiredPlanSlugs(): string[] {
  const value = process.env.CLERK_REQUIRED_PLAN_SLUGS ?? '';

  return value
    .split(',')
    .map((slug) => slug.trim())
    .filter((slug): slug is string => slug.length > 0);
}

export function hasRequiredPlan(hasFn: ((args: { plan: string }) => boolean) | undefined): boolean {
  const requiredPlans = getRequiredPlanSlugs();

  if (requiredPlans.length === 0) {
    return true;
  }

  if (!hasFn) {
    return false;
  }

  return requiredPlans.some((plan) => {
    try {
      return hasFn({ plan });
    } catch (error) {
      console.warn('[Billing] Failed to evaluate plan entitlement', { plan, error });
      return false;
    }
  });
}

