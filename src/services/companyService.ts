import { supabase } from '../lib/supabase';

export interface CompanyMember {
  id: string;
  company_id: string;
  email: string;
  role: 'owner' | 'member';
  added_by: string;
  created_at: Date;
}

export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching company members:', error);
    throw error;
  }

  return (data || []).map((member) => ({
    ...member,
    created_at: new Date(member.created_at),
  }));
}

export async function addCompanyMember(
  companyId: string,
  email: string,
  addedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .insert({
      company_id: companyId,
      email: email,
      role: 'member',
      added_by: addedBy,
    });

  if (error) {
    console.error('Error adding company member:', error);
    throw error;
  }
}

export async function removeCompanyMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing company member:', error);
    throw error;
  }
}

export async function ensureCompanyExists(
  companyId: string,
  companyName: string,
  creatorEmail: string
): Promise<void> {
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .maybeSingle();

  if (!existingCompany) {
    const { error: companyError } = await supabase
      .from('companies')
      .insert({
        id: companyId,
        name: companyName,
        created_by: creatorEmail,
      });

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw companyError;
    }

    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        company_id: companyId,
        email: creatorEmail,
        role: 'owner',
        added_by: creatorEmail,
      });

    if (memberError) {
      console.error('Error adding company owner:', memberError);
      throw memberError;
    }
  }
}
