export const ROLE_HOME_PATH: Record<string, string> = {
  admin: "/dashboard",
  doctor: "/doctor/patients",
  registrator: "/register/registration",
  superadmin: "/superadmin/clinics",
};

export function getRoleHomePath(role?: string | null): string {
  return (role && ROLE_HOME_PATH[role]) || "/";
}
