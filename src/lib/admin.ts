/* ============================================================
   Admin identity — a single operator email owns the admin panel
   and its server actions. Kept in one place so the page, the API
   routes and the shell all agree.
   ============================================================ */

export const ADMIN_EMAIL = "nihonnosekai8@gmail.com";

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}
