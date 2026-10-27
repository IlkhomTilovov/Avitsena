export type VisitStatus = "pending" | "in_progress" | "completed" | "cancelled";

const STATUS_MAP: Record<VisitStatus, { label: string; className: string }> = {
  pending: { label: "Kutilmoqda", className: "bg-[#FFF7E6] text-[#D48806]" },
  in_progress: { label: "Jarayonda", className: "bg-[#E6F4FF] text-[#1677FF]" },
  completed: { label: "Tasdiqlangan", className: "bg-[#E9FBF4] text-[#0D9488]" },
  cancelled: { label: "Bekor qilindi", className: "bg-[#F5F5F5] text-[#8F99A3]" },
};

export function getVisitStatusBadge(status: string) {
  return (
    STATUS_MAP[status as VisitStatus] ?? {
      label: status,
      className: "bg-[#F5F5F5] text-[#8F99A3]",
    }
  );
}

export const monthNamesShort = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyun",
  "iyul",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

export const monthNamesFull = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];
