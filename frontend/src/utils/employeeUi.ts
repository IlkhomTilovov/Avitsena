export const ROLE_LABEL: Record<string, string> = {
  doctor: "Shifokor",
  registrator: "Registrator",
  admin: "Administrator",
};

export const ROLE_BADGE_COLOR: Record<string, string> = {
  doctor: "bg-[#EAF1FF] text-[#2D6FE0]",
  registrator: "bg-[#FEF6E6] text-[#B5820A]",
  admin: "bg-[#EFEAFB] text-[#7A5BD8]",
};

const AVATAR_COLORS = [
  { bg: "#E7F0FA", text: "#2A81D8" },
  { bg: "#FCEAF2", text: "#D6468A" },
  { bg: "#FEF3E0", text: "#D98A1B" },
  { bg: "#EFEAFB", text: "#7A5BD8" },
  { bg: "#E9FBF4", text: "#0D9488" },
  { bg: "#FDECEC", text: "#D3453F" },
];

export function getAvatarColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(fio: string) {
  const parts = fio.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}
