// Server-side adapter gate. No provider credentials are serialized by this module.
export function providerActivation(provider, env = globalThis.process?.env || {}) {
  const policy=provider.activation;
  if (!policy) return {allowed:provider.enabled !== false,status:provider.enabled === false?'disabled':'ready',reason:'Existing provider policy'};
  if (!policy.enableEnvVar || env[policy.enableEnvVar] !== 'true') return {allowed:false,status:'disabled',reason:'Explicit provider opt-in is off'};
  if (policy.termsEnvVar && env[policy.termsEnvVar] !== 'true') return {allowed:false,status:'license-required',reason:'Provider-specific terms/access review is required'};
  // Unknown billing is gated the same as paid. Default deployments never make paid calls.
  if (policy.billingClass !== 'free') {
    const budget=Number(env.LIVE_MAP_PAID_MONTHLY_CAP_USD || 0);
    if(env.LIVE_MAP_PROVIDER_MODE !== 'byo-paid' || env.LIVE_MAP_ALLOW_PAID !== 'true' || !Number.isFinite(budget) || budget<=0) return {allowed:false,status:'disabled',reason:'Paid/unknown-price adapter requires explicit fork billing mode and a positive spending cap'};
    if (!policy.hardBudgetEnforced) return {allowed:false,status:'disabled',reason:'Adapter has no hard request/spend limiter'};
  }
  if ((policy.credentialEnvVars || []).some(name=>!env[name])) return {allowed:false,status:'configuration-required',reason:'Owner-managed server configuration is incomplete'};
  return {allowed:true,status:'ready',reason:'Configured provider policy permits a bounded request'};
}
