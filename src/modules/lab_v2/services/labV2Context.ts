import { supabase } from '../../../config/supabase';

export interface LabV2Context {
  user_id: string | null;
  user_name: string | null;
  company_id: string | null;
  department_id: string | null;
}

const LAB_V2_CONTEXT_CACHE_TTL_MS = 60 * 1000;

let cachedContext: LabV2Context | null = null;
let cachedContextAt = 0;
let inFlightContextPromise: Promise<LabV2Context> | null = null;
let authInvalidationAttached = false;

export function invalidateLabV2ContextCache(): void {
  cachedContext = null;
  cachedContextAt = 0;
  inFlightContextPromise = null;
}

function ensureAuthInvalidationAttached(): void {
  if (authInvalidationAttached) return;
  authInvalidationAttached = true;

  supabase.auth.onAuthStateChange(() => {
    invalidateLabV2ContextCache();
  });
}

async function getCompanyIdFromSettings(): Promise<string | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('main_company_id')
    .eq('id', 'global')
    .maybeSingle();

  if (error) return null;
  return (data as any)?.main_company_id || null;
}

async function getCompanyIdFromRpc(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_company_id');
  if (error) return null;
  return (data as any) || null;
}

async function fetchLabV2Context(): Promise<LabV2Context> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user_id = sessionData.session?.user?.id || null;

  let user_name: string | null = null;
  let department_id: string | null = null;
  let company_id: string | null = null;

  if (user_id) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, display_name, department_id, company_id')
      .eq('id', user_id)
      .maybeSingle();

    user_name = (profile as any)?.display_name || (profile as any)?.name || null;
    department_id = (profile as any)?.department_id || null;
    company_id = (profile as any)?.company_id || null;
  }

  const settingsCompany = await getCompanyIdFromSettings();
  if (settingsCompany) company_id = settingsCompany;

  if (!company_id) {
    const rpcCompany = await getCompanyIdFromRpc();
    if (rpcCompany) company_id = rpcCompany;
  }

  return { user_id, user_name, company_id, department_id };
}

export async function getLabV2Context(options?: { forceRefresh?: boolean }): Promise<LabV2Context> {
  ensureAuthInvalidationAttached();

  const forceRefresh = options?.forceRefresh === true;
  const hasFreshCache =
    !forceRefresh &&
    cachedContext !== null &&
    Date.now() - cachedContextAt < LAB_V2_CONTEXT_CACHE_TTL_MS;

  if (hasFreshCache) {
    return cachedContext as LabV2Context;
  }

  if (!forceRefresh && inFlightContextPromise) {
    return inFlightContextPromise;
  }

  inFlightContextPromise = fetchLabV2Context()
    .then((ctx) => {
      cachedContext = ctx;
      cachedContextAt = Date.now();
      return ctx;
    })
    .finally(() => {
      inFlightContextPromise = null;
    });

  return inFlightContextPromise;
}
