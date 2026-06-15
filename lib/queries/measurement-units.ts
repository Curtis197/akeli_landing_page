import { createClient } from "@/lib/supabase/client";

export type MeasurementUnit = {
  code: string;
  name_fr: string;
  name_en: string;
};

export async function fetchMeasurementUnits(): Promise<MeasurementUnit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("measurement_unit")
    .select("code, name_fr, name_en")
    .order("name_fr");
  if (error) throw error;
  return data ?? [];
}
