import type { SupabaseClient } from "@supabase/supabase-js";

export type PayoutMethod = "mobile_money" | "bank_transfer";
export type PayoutIdentityStatus = "submitted" | "verified";

export interface PayoutIdentity {
  creator_id: string;
  legal_full_name: string;
  country: string;
  id_document_number: string;
  payout_method: PayoutMethod;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  status: PayoutIdentityStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutIdentityInput = {
  legal_full_name: string;
  country: string;
  id_document_number: string;
  payout_method: PayoutMethod;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
};

export async function getPayoutIdentity(
  supabase: SupabaseClient,
  creatorId: string
): Promise<PayoutIdentity | null> {
  const { data, error } = await supabase
    .from("creator_payout_identity")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (error) throw error;
  return data as PayoutIdentity | null;
}

export async function upsertPayoutIdentity(
  supabase: SupabaseClient,
  creatorId: string,
  input: PayoutIdentityInput
): Promise<PayoutIdentity> {
  const { data, error } = await supabase
    .from("creator_payout_identity")
    .upsert(
      {
        creator_id: creatorId,
        ...input,
        status: "submitted",
        verified_at: null,
      },
      { onConflict: "creator_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as PayoutIdentity;
}
