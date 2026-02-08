import { supabase } from '../../../config/supabase';

export interface LabV2Context {
  user_id: string | null;
  user_name: string | null;
  company_id: string | null;
  department_id: string | null;
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

export async function getLabV2Context(): Promise<LabV2Context> {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData.user?.id || null;

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

