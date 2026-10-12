// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hasEstablecimientoForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("establecimientos")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return !!data?.id;
}
