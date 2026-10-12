/** Lab user only — NO password here, ever. */
export const PLATFORM_DEMO_EMAIL = "testprueba@gmail.com";

export function isPlatformDemoEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PLATFORM_DEMO_EMAIL;
}
