// Backend xato matnini ({ success: false, message }) foydalanuvchiga ko'rsatish uchun oladi
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  return typeof message === "string" && message ? message : fallback;
}
