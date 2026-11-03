import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Drawer, Input, notification } from "antd";
import dayjs from "dayjs";
import {
  FiCalendar,
  FiShoppingBag,
  FiShield,
  FiTrendingUp,
  FiMoreHorizontal,
  FiTool,
  FiHome,
  FiUsers,
  FiZap,
  FiPackage,
  FiTag,
  FiEdit2,
  FiArchive,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";
import { TbFlask, TbPill } from "react-icons/tb";
import {
  AvitcenaAdmin,
  CreateFinanceCategoryPayload,
  FinanceCategory,
} from "../queries/query";

const ICON_OPTIONS: { key: string; icon: React.ReactNode }[] = [
  { key: "calendar", icon: <FiCalendar /> },
  { key: "flask", icon: <TbFlask /> },
  { key: "shopping-bag", icon: <FiShoppingBag /> },
  { key: "shield", icon: <FiShield /> },
  { key: "trending-up", icon: <FiTrendingUp /> },
  { key: "pill", icon: <TbPill /> },
  { key: "tool", icon: <FiTool /> },
  { key: "home", icon: <FiHome /> },
  { key: "users", icon: <FiUsers /> },
  { key: "flash", icon: <FiZap /> },
  { key: "package", icon: <FiPackage /> },
  { key: "tag", icon: <FiTag /> },
];

const ICON_MAP: Record<string, React.ReactNode> = ICON_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.key]: item.icon }),
  { dots: <FiMoreHorizontal /> } as Record<string, React.ReactNode>
);

const COLOR_OPTIONS: { key: string; hex: string }[] = [
  { key: "teal", hex: "#0D9488" },
  { key: "cyan", hex: "#06B6D4" },
  { key: "blue", hex: "#2A81D8" },
  { key: "purple", hex: "#8B5CF6" },
  { key: "orange", hex: "#F2A93B" },
  { key: "red", hex: "#E5484D" },
  { key: "gray", hex: "#8F99A3" },
];

function colorHex(key: string) {
  return COLOR_OPTIONS.find((c) => c.key === key)?.hex || "#8F99A3";
}

function money(n: number) {
  return `${Math.round(n).toLocaleString("uz-UZ")} so'm`;
}

export default function FinanceCategoriesDrawer({
  open,
  onClose,
  clinicId,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
}) {
  const queryClient = useQueryClient();
  const [notifApi, contextHolder] = notification.useNotification();

  const [type, setType] = useState<"kirim" | "chiqim">("kirim");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [color, setColor] = useState("teal");

  const dateFrom = useMemo(() => dayjs().startOf("month").format("YYYY-MM-DD"), []);
  const dateTo = useMemo(() => dayjs().endOf("month").format("YYYY-MM-DD"), []);

  const { data: kirimData } = useQuery({
    queryKey: ["financeCategories", clinicId, "kirim", dateFrom, dateTo],
    queryFn: () =>
      AvitcenaAdmin.financeCategories({ clinic: clinicId, type: "kirim", date_from: dateFrom, date_to: dateTo }),
    enabled: open,
  });

  const { data: chiqimData } = useQuery({
    queryKey: ["financeCategories", clinicId, "chiqim", dateFrom, dateTo],
    queryFn: () =>
      AvitcenaAdmin.financeCategories({ clinic: clinicId, type: "chiqim", date_from: dateFrom, date_to: dateTo }),
    enabled: open,
  });

  const kirimCategories = kirimData?.data?.categories || [];
  const chiqimCategories = chiqimData?.data?.categories || [];
  const categories = type === "kirim" ? kirimCategories : chiqimCategories;

  const totalAmount = categories.reduce((sum, c) => sum + (c.amount || 0), 0);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setIcon("tag");
    setColor("teal");
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateFinanceCategoryPayload) =>
      AvitcenaAdmin.createFinanceCategory(payload, clinicId),
    onSuccess: () => {
      notifApi.success({ message: "Kategoriya qo'shildi" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["financeCategories"] });
    },
    onError: () => {
      notifApi.error({ message: "Xatolik", description: "Kategoriyani saqlab bo'lmadi" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; icon?: string; color?: string; archived?: boolean } }) =>
      AvitcenaAdmin.updateFinanceCategory(id, payload, clinicId),
    onSuccess: () => {
      notifApi.success({ message: "Yangilandi" });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["financeCategories"] });
    },
    onError: () => {
      notifApi.error({ message: "Xatolik", description: "Yangilab bo'lmadi" });
    },
  });

  const startEdit = (category: FinanceCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: { name, icon, color } });
    } else {
      createMutation.mutate({ type, name, icon, color });
    }
  };

  const handleArchive = (category: FinanceCategory) => {
    updateMutation.mutate({ id: category.id, payload: { archived: true } });
  };

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Drawer
      title={null}
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      width={420}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      {contextHolder}

      <div className="px-5 py-4 border-b border-[#F0F2F3] flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-[700]">Moliya kategoriyalari</h2>
          <p className="text-[12px] text-[#8F99A3]">
            Kirim va chiqimlar shu turlar bo'yicha guruhlanadi
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="w-[28px] h-[28px] flex items-center justify-center rounded-[8px] text-[#8F99A3] hover:bg-[#F1F5F4] cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-[8px] p-1">
          <button
            onClick={() => setType("kirim")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-[600] cursor-pointer transition-colors ${
              type === "kirim" ? "bg-white shadow-sm text-[#0D9488]" : "text-[#44525C]"
            }`}
          >
            <FiArrowUpRight /> Kirim {kirimCategories.length ? `(${kirimCategories.length})` : ""}
          </button>
          <button
            onClick={() => setType("chiqim")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-[600] cursor-pointer transition-colors ${
              type === "chiqim" ? "bg-white shadow-sm text-[#E5484D]" : "text-[#44525C]"
            }`}
          >
            <FiArrowDownRight /> Chiqim {chiqimCategories.length ? `(${chiqimCategories.length})` : ""}
          </button>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] text-[#8F99A3]">
            {dayjs().format("MMMM")} oyidagi {type === "kirim" ? "kirim" : "chiqim"}
          </p>
          <p className={`text-[14px] font-[700] ${type === "kirim" ? "text-[#0D9488]" : "text-[#E5484D]"}`}>
            {money(totalAmount)}
          </p>
        </div>
        <div className="flex h-[6px] w-full rounded-full overflow-hidden bg-[#F1F5F4]">
          {categories
            .filter((c) => c.amount > 0)
            .map((c) => (
              <div
                key={c.id}
                style={{
                  width: `${totalAmount ? (c.amount / totalAmount) * 100 : 0}%`,
                  backgroundColor: colorHex(c.color),
                }}
              />
            ))}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-2 max-h-[38vh] overflow-y-auto pb-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-3 border border-[#F0F2F3] rounded-[10px] px-3 py-2.5"
          >
            <span
              className="w-[36px] h-[36px] shrink-0 rounded-[10px] flex items-center justify-center text-[16px]"
              style={{
                backgroundColor: `${colorHex(category.color)}1A`,
                color: colorHex(category.color),
              }}
            >
              {ICON_MAP[category.icon] || <FiTag />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-[600] flex items-center gap-1.5 truncate">
                {category.name}
                {category.is_system && (
                  <span className="text-[10px] font-[600] px-1.5 py-0.5 rounded-full bg-[#F1F5F4] text-[#44525C]">
                    Tizim
                  </span>
                )}
              </p>
              <p className="text-[11px] text-[#8F99A3]">
                {category.is_system ? "Qabullardan avtomatik tushadi" : `${category.count} ta yozuv`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-[700]">
                {category.amount > 0 ? money(category.amount) : "—"}
              </p>
              {!category.is_system && (
                <p className="text-[11px] text-[#8F99A3]">{category.count} ta yozuv</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => startEdit(category)}
                title="Tahrirlash"
                className="w-[26px] h-[26px] flex items-center justify-center rounded-[6px] text-[#8F99A3] hover:bg-[#F1F5F4] cursor-pointer"
              >
                <FiEdit2 size={13} />
              </button>
              {!category.is_system && (
                <button
                  onClick={() => handleArchive(category)}
                  title="Arxivlash"
                  className="w-[26px] h-[26px] flex items-center justify-center rounded-[6px] text-[#8F99A3] hover:bg-[#FFECEC] hover:text-[#E5484D] cursor-pointer"
                >
                  <FiArchive size={13} />
                </button>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="text-center text-[12px] text-[#8F99A3] py-6">Kategoriyalar topilmadi</p>
        )}
      </div>

      <div className="border-t border-[#F0F2F3] px-5 py-4 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-[700]">
            {editingId ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
          </p>
          <span className="text-[11px] text-[#8F99A3]">Faqat administrator</span>
        </div>

        {!editingId && (
          <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-[8px] p-1 mb-3">
            <button
              onClick={() => setType("kirim")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-[600] cursor-pointer transition-colors ${
                type === "kirim" ? "bg-white shadow-sm text-[#0D9488]" : "text-[#44525C]"
              }`}
            >
              <FiArrowUpRight /> Kirim
            </button>
            <button
              onClick={() => setType("chiqim")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-[600] cursor-pointer transition-colors ${
                type === "chiqim" ? "bg-white shadow-sm text-[#E5484D]" : "text-[#44525C]"
              }`}
            >
              <FiArrowDownRight /> Chiqim
            </button>
          </div>
        )}

        <p className="text-[12px] font-[500] text-[#44525C] mb-1.5">Nomi</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masalan: Fizioterapiya"
          prefix={<span style={{ color: colorHex(color) }}>{ICON_MAP[icon] || <FiTag />}</span>}
          className="!h-[38px] mb-3"
        />

        <p className="text-[12px] font-[500] text-[#44525C] mb-1.5">Rang</p>
        <div className="flex items-center gap-2 mb-3">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className={`w-[24px] h-[24px] rounded-full cursor-pointer border-2 ${
                color === c.key ? "border-[#44525C]" : "border-transparent"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <p className="text-[12px] font-[500] text-[#44525C] mb-1.5">Ikonka</p>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setIcon(opt.key)}
              className={`h-[32px] flex items-center justify-center rounded-[8px] text-[14px] cursor-pointer border ${
                icon === opt.key
                  ? "border-[#0D9488] text-[#0D9488] bg-[#E9FBF4]"
                  : "border-[#E0E6EB] text-[#8F99A3] hover:bg-[#F9FAFB]"
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-[#8F99A3] mb-3">
          Kategoriya o'chirilmaydi, arxivlanadi
        </p>

        <div className="flex items-center gap-2">
          {editingId && (
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] cursor-pointer"
            >
              Bekor qilish
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-[600] bg-[#0D9488] hover:bg-[#0C8377] cursor-pointer disabled:opacity-60"
          >
            {isSaving ? "Saqlanmoqda..." : editingId ? "Saqlash" : "+ Qo'shish"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
