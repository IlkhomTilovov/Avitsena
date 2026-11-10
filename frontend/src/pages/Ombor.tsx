import { ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Switch,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { LuPackageMinus, LuPackagePlus, LuSearch } from "react-icons/lu";
import dayjs, { Dayjs } from "dayjs";
import SecureStorage from "react-secure-storage";
import {
  AvitcenaAdmin,
  StockMovement,
  StockMovementType,
  StockStatus,
  WarehouseCategory,
  WarehouseItem,
} from "../queries/query";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { apiErrorMessage } from "../utils/apiError";
import "../App.css";

type Tab = "items" | "movements" | "expiring";
type Notify = (type: "success" | "error", message: string, description?: string) => void;

const CATEGORIES: { value: WarehouseCategory; label: string }[] = [
  { value: "medicine", label: "Dori" },
  { value: "material", label: "Tibbiy material" },
  { value: "lab", label: "Laboratoriya" },
  { value: "household", label: "Xo'jalik" },
  { value: "other", label: "Boshqa" },
];

const UNITS = ["dona", "quti", "paket", "flakon", "ampula", "ml", "l", "gr", "kg", "rulon"];

const MOVEMENT_LABELS: Record<StockMovementType, { label: string; className: string }> = {
  in: { label: "Kirim", className: "bg-[#E9FBF4] text-[#0D9488]" },
  out: { label: "Chiqim", className: "bg-[#EEF6FD] text-[#2A81D8]" },
  write_off: { label: "Hisobdan chiqarish", className: "bg-[#FFECEC] text-[#E5484D]" },
  adjust: { label: "Inventarizatsiya", className: "bg-[#FFF4E0] text-[#B26A00]" },
};

const STOCK_BADGE: Record<StockStatus, { label: string; className: string } | null> = {
  ok: null,
  low: { label: "Kam qoldi", className: "bg-[#FFF4E0] text-[#B26A00]" },
  out: { label: "Tugagan", className: "bg-[#FFECEC] text-[#E5484D]" },
};

function money(n: number | undefined | null) {
  return `${Math.round(n || 0).toLocaleString("uz-UZ")} so'm`;
}

function qty(n: number | undefined | null) {
  return Number(n || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-[600] whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function ChangeCell({ movement }: { movement: StockMovement }) {
  const positive = movement.change > 0;
  return (
    <span className={`font-[600] ${positive ? "text-[#0D9488]" : "text-[#E5484D]"}`}>
      {positive ? "+" : ""}
      {qty(movement.change)} {movement.unit}
    </span>
  );
}

// ========================= Kirim / chiqim =========================

function MovementModal({
  open,
  onClose,
  initialType,
  initialItem,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  initialType: StockMovementType;
  initialItem?: WarehouseItem;
  notify: Notify;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [type, setType] = useState<StockMovementType>(initialType);
  const [itemSearch, setItemSearch] = useState("");
  const term = useDebouncedValue(itemSearch.trim());
  const [selectedItem, setSelectedItem] = useState<WarehouseItem | undefined>(initialItem);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setSelectedItem(initialItem);
      setItemSearch("");
      form.resetFields();
      form.setFieldsValue({
        item: initialItem?.id,
        date: dayjs(),
        quantity: initialType === "adjust" ? initialItem?.quantity : undefined,
        unit_price: initialItem?.last_price || undefined,
      });
    }
  }, [open, initialType, initialItem]);

  const { data: itemsData, isFetching } = useQuery({
    queryKey: ["warehouseItemOptions", term],
    queryFn: () => AvitcenaAdmin.getWarehouseItems({ search: term, per_page: 30 }),
    enabled: open,
  });

  const options = (itemsData?.data || []).map((item) => ({
    value: item.id,
    label: `${item.name} — qoldiq ${qty(item.quantity)} ${item.unit}`,
    item,
  }));
  if (selectedItem && !options.some((o) => o.value === selectedItem.id)) {
    options.unshift({
      value: selectedItem.id,
      label: `${selectedItem.name} — qoldiq ${qty(selectedItem.quantity)} ${selectedItem.unit}`,
      item: selectedItem,
    });
  }

  const { mutate, isLoading } = useMutation(
    (values: any) =>
      AvitcenaAdmin.createStockMovement({
        item: values.item,
        type,
        quantity: values.quantity,
        unit_price: type === "in" ? values.unit_price ?? null : undefined,
        payment_method: type === "in" && values.unit_price ? values.payment_method : undefined,
        supplier: type === "in" ? values.supplier?.trim() : undefined,
        expiry_date:
          type === "in" && values.expiry_date
            ? (values.expiry_date as Dayjs).format("YYYY-MM-DD")
            : undefined,
        note: values.note?.trim() || undefined,
        date: (values.date as Dayjs)?.format("YYYY-MM-DD"),
      }),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(["warehouse"]);
        queryClient.invalidateQueries(["warehouseItemOptions"]);
        notify(
          "success",
          `${MOVEMENT_LABELS[type].label} saqlandi`,
          `${result.data.item_name}: yangi qoldiq ${qty(result.data.balance_after)} ${result.data.unit}`
        );
        onClose();
      },
      onError: (error) =>
        notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  const unit = selectedItem?.unit || "";
  const title =
    type === "adjust" ? "Inventarizatsiya" : type === "in" ? "Omborga kirim" : "Ombordan chiqim";

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={false} destroyOnHidden>
      {type !== "adjust" && (
        <Segmented<StockMovementType>
          block
          value={type}
          onChange={setType}
          options={[
            { value: "in", label: "Kirim" },
            { value: "out", label: "Chiqim" },
            { value: "write_off", label: "Hisobdan chiqarish" },
          ]}
          className="!mb-4"
        />
      )}
      <Form form={form} layout="vertical" onFinish={(v) => mutate(v)}>
        <Form.Item
          name="item"
          label="Mahsulot"
          rules={[{ required: true, message: "Mahsulotni tanlang" }]}
        >
          <Select
            aria-label="Mahsulot"
            showSearch
            filterOption={false}
            onSearch={setItemSearch}
            onChange={(_v, option: any) => setSelectedItem(option?.item)}
            disabled={type === "adjust"}
            placeholder="Nomini yozing"
            notFoundContent={isFetching ? "Qidirilmoqda..." : "Mahsulot topilmadi"}
            options={options}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label={
            type === "adjust"
              ? `Sanalgan haqiqiy qoldiq${unit ? ` (${unit})` : ""}`
              : `Miqdori${unit ? ` (${unit})` : ""}`
          }
          rules={[{ required: true, message: "Miqdorni kiriting" }]}
          extra={
            selectedItem && type !== "in"
              ? `Hozirgi qoldiq: ${qty(selectedItem.quantity)} ${selectedItem.unit}`
              : undefined
          }
        >
          <InputNumber aria-label="Miqdori" min={0} step={1} className="!w-full" />
        </Form.Item>

        {type === "in" && (
          <>
            <Form.Item name="unit_price" label="Bir birlik narxi (so'm)">
              <InputNumber<number>
                aria-label="Bir birlik narxi"
                min={0}
                className="!w-full"
                formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                parser={(value) => Number((value || "").replace(/\s/g, ""))}
              />
            </Form.Item>
            <Form.Item
              name="payment_method"
              label="To'lov turi"
              dependencies={["unit_price"]}
              extra="Narx kiritilsa, xarid Moliyada chiqim bo'lib yoziladi"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    !getFieldValue("unit_price") || value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Xarid uchun to'lov turini tanlang")),
                }),
              ]}
            >
              <Select
                aria-label="To'lov turi"
                allowClear
                placeholder="Naqd yoki karta"
                options={[
                  { value: "cash", label: "Naqd" },
                  { value: "card", label: "Karta" },
                ]}
              />
            </Form.Item>
            <Form.Item name="supplier" label="Yetkazib beruvchi">
              <Input placeholder="Masalan: Pharma Trade MChJ" />
            </Form.Item>
            <Form.Item name="expiry_date" label="Yaroqlilik muddati">
              <DatePicker format="DD.MM.YYYY" className="!w-full" />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="note"
          label={
            type === "write_off"
              ? "Sababi"
              : type === "out"
              ? "Qayerga yoki kimga berildi"
              : "Izoh"
          }
          rules={
            type === "write_off"
              ? [{ required: true, whitespace: true, message: "Sababini yozing" }]
              : []
          }
        >
          <Input.TextArea
            rows={2}
            placeholder={
              type === "write_off"
                ? "Masalan: muddati o'tgan, singan"
                : type === "out"
                ? "Masalan: Statsionar 101, protsedura xonasi"
                : undefined
            }
          />
        </Form.Item>

        <Form.Item name="date" label="Sana" rules={[{ required: true, message: "Sanani tanlang" }]}>
          <DatePicker format="DD.MM.YYYY" className="!w-full" allowClear={false} />
        </Form.Item>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full h-[40px] rounded-[8px] text-white font-[500] cursor-pointer disabled:opacity-70 ${
            type === "in" ? "bg-[#0D9488]" : type === "adjust" ? "bg-[#B26A00]" : "bg-[#E5484D]"
          }`}
        >
          {isLoading ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </Form>
    </Modal>
  );
}

// ========================= Mahsulot qo'shish / tahrirlash =========================

function ItemModal({
  open,
  item,
  onClose,
  notify,
}: {
  open: boolean;
  item: WarehouseItem | null;
  onClose: () => void;
  notify: Notify;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(
        item
          ? {
              name: item.name,
              category: item.category,
              unit: item.unit,
              min_quantity: item.min_quantity,
              is_active: item.is_active,
            }
          : { category: "medicine", unit: "dona", min_quantity: 0 }
      );
    }
  }, [open, item]);

  const { mutate, isLoading } = useMutation(
    (values: any) => {
      const payload = {
        name: values.name,
        category: values.category,
        unit: values.unit,
        min_quantity: values.min_quantity ?? 0,
      };
      return item
        ? AvitcenaAdmin.updateWarehouseItem(item.id, { ...payload, is_active: values.is_active })
        : AvitcenaAdmin.createWarehouseItem(payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["warehouse"]);
        notify("success", item ? "Mahsulot saqlandi" : "Mahsulot qo'shildi");
        onClose();
      },
      onError: (error) =>
        notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  return (
    <Modal
      title={item ? "Mahsulotni tahrirlash" : "Mahsulot qo'shish"}
      open={open}
      onCancel={onClose}
      footer={false}
    >
      <Form form={form} layout="vertical" onFinish={(v) => mutate(v)}>
        <Form.Item
          name="name"
          label="Nomi"
          rules={[{ required: true, whitespace: true, message: "Nomini kiriting" }]}
        >
          <Input placeholder="Masalan: Paracetamol 500 mg" />
        </Form.Item>
        <Form.Item name="category" label="Turi">
          <Select aria-label="Turi" options={CATEGORIES} />
        </Form.Item>
        <Form.Item
          name="unit"
          label="O'lchov birligi"
          rules={[{ required: true, whitespace: true, message: "Birlikni kiriting" }]}
        >
          <Select
            aria-label="O'lchov birligi"
            showSearch
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
        </Form.Item>
        <Form.Item
          name="min_quantity"
          label="Minimal qoldiq"
          extra="Qoldiq shundan kam bo'lsa, mahsulot 'Kam qoldi' deb belgilanadi"
        >
          <InputNumber min={0} className="!w-full" />
        </Form.Item>
        {item && (
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[40px] rounded-[8px] bg-[#0D9488] text-white font-[500] cursor-pointer disabled:opacity-70"
        >
          {isLoading ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </Form>
    </Modal>
  );
}

// ========================= Mahsulot tafsilotlari =========================

function MovementsTable({ movements, showItem }: { movements: StockMovement[]; showItem?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] min-w-[640px]">
        <thead>
          <tr className="text-[11px] text-[#8F99A3] border-b border-[#F0F2F3]">
            <th className="px-3 py-2 font-[600]">SANA</th>
            {showItem && <th className="px-3 py-2 font-[600]">MAHSULOT</th>}
            <th className="px-3 py-2 font-[600]">TURI</th>
            <th className="px-3 py-2 font-[600] text-right">MIQDOR</th>
            <th className="px-3 py-2 font-[600] text-right">QOLDIQ</th>
            <th className="px-3 py-2 font-[600]">TAFSILOT</th>
            <th className="px-3 py-2 font-[600]">XODIM</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-b border-[#F7F8F9] align-top">
              <td className="px-3 py-2 whitespace-nowrap">{dayjs(m.date).format("DD.MM.YYYY")}</td>
              {showItem && <td className="px-3 py-2 font-[500]">{m.item_name}</td>}
              <td className="px-3 py-2">
                <Badge className={MOVEMENT_LABELS[m.type].className}>{MOVEMENT_LABELS[m.type].label}</Badge>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <ChangeCell movement={m} />
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {qty(m.balance_after)} {m.unit}
              </td>
              <td className="px-3 py-2 text-[#64727B]">
                {m.unit_price != null && (
                  <span className="block">
                    {money(m.unit_price)} × {qty(Math.abs(m.change))} = {money(m.total)}
                  </span>
                )}
                {m.supplier && <span className="block">Yetkazib beruvchi: {m.supplier}</span>}
                {m.expiry_date && (
                  <span className="block">Muddati: {dayjs(m.expiry_date).format("DD.MM.YYYY")}</span>
                )}
                {m.note && <span className="block whitespace-pre-wrap">{m.note}</span>}
              </td>
              <td className="px-3 py-2 text-[#64727B] whitespace-nowrap">{m.created_by || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemDrawer({
  itemId,
  onClose,
  isAdmin,
  onMove,
  onEdit,
  notify,
}: {
  itemId: string | null;
  onClose: () => void;
  isAdmin: boolean;
  onMove: (type: StockMovementType, item: WarehouseItem) => void;
  onEdit: (item: WarehouseItem) => void;
  notify: Notify;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["warehouse", "item", itemId],
    queryFn: () => AvitcenaAdmin.getWarehouseItem(itemId!),
    enabled: !!itemId,
  });

  const item = data?.data;

  const deleteMutation = useMutation(() => AvitcenaAdmin.deleteWarehouseItem(itemId!), {
    onSuccess: () => {
      queryClient.invalidateQueries(["warehouse"]);
      notify("success", "Mahsulot o'chirildi");
      onClose();
    },
    onError: (error) =>
      notify("error", "O'chirib bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
  });

  return (
    <Drawer open={!!itemId} onClose={onClose} width={760} title={item?.name || "Mahsulot"}>
      {isLoading || !item ? (
        <div className="flex justify-center py-16">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Qoldiq", value: `${qty(item.quantity)} ${item.unit}` },
              { label: "Minimal qoldiq", value: `${qty(item.min_quantity)} ${item.unit}` },
              { label: "Oxirgi narx", value: money(item.last_price) },
              { label: "Qiymati", value: money(item.value) },
            ].map((card) => (
              <div key={card.label} className="border border-[#E8E8E8] rounded-[10px] px-3 py-2">
                <p className="text-[11px] text-[#8F99A3]">{card.label}</p>
                <p className="font-[700]">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[13px] text-[#64727B]">{item.category_display}</span>
            {STOCK_BADGE[item.stock_status] && (
              <Badge className={STOCK_BADGE[item.stock_status]!.className}>
                {STOCK_BADGE[item.stock_status]!.label}
              </Badge>
            )}
            {!item.is_active && <Badge className="bg-[#F1F5F4] text-[#64727B]">Nofaol</Badge>}
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {item.is_active && (
              <>
                <button
                  onClick={() => onMove("in", item)}
                  className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-[8px] bg-[#0D9488] text-white text-[13px] cursor-pointer"
                >
                  <LuPackagePlus /> Kirim
                </button>
                <button
                  onClick={() => onMove("out", item)}
                  className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-[8px] border border-[#E5484D] text-[#E5484D] text-[13px] cursor-pointer"
                >
                  <LuPackageMinus /> Chiqim
                </button>
              </>
            )}
            {isAdmin && item.is_active && (
              <button
                onClick={() => onMove("adjust", item)}
                className="px-3.5 h-[34px] rounded-[8px] border border-[#B26A00] text-[#B26A00] text-[13px] cursor-pointer"
              >
                Inventarizatsiya
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-[8px] border border-[#E0E6EB] text-[13px] cursor-pointer"
                >
                  <FiEdit2 /> Tahrirlash
                </button>
                <Popconfirm
                  title="Mahsulotni o'chirish"
                  description="Faqat harakati bo'lmagan mahsulotni o'chirish mumkin"
                  okText="Ha"
                  cancelText="Yo'q"
                  onConfirm={() => deleteMutation.mutate()}
                >
                  <button
                    aria-label="Mahsulotni o'chirish"
                    className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-[8px] border border-[#FDEDED] text-[#E24C4C] text-[13px] cursor-pointer"
                  >
                    <FiTrash2 /> O'chirish
                  </button>
                </Popconfirm>
              </>
            )}
          </div>

          <h4 className="font-[600] text-[14px] mb-2">Harakatlar tarixi</h4>
          {(item.movements || []).length === 0 ? (
            <Empty description="Hali kirim yoki chiqim bo'lmagan" />
          ) : (
            <MovementsTable movements={item.movements || []} />
          )}
        </>
      )}
    </Drawer>
  );
}

// ========================= Sahifa =========================

export default function Ombor() {
  const [notifApi, contextHolder] = notification.useNotification();
  const isAdmin = SecureStorage.getItem("role") === "admin";
  const notify: Notify = (type, message, description) => notifApi[type]({ message, description });

  const [tab, setTab] = useState<Tab>("items");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState<WarehouseCategory | undefined>();
  const [stock, setStock] = useState<"" | "low" | "out">("");
  const [page, setPage] = useState(1);
  const [movementType, setMovementType] = useState<StockMovementType | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [movementsPage, setMovementsPage] = useState(1);
  const perPage = 15;

  const [movementModal, setMovementModal] = useState<{
    open: boolean;
    type: StockMovementType;
    item?: WarehouseItem;
  }>({ open: false, type: "in" });
  const [itemModal, setItemModal] = useState<{ open: boolean; item: WarehouseItem | null }>({
    open: false,
    item: null,
  });
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const { data: summaryData } = useQuery({
    queryKey: ["warehouse", "summary"],
    queryFn: () => AvitcenaAdmin.getWarehouseSummary(),
  });
  const summary = summaryData?.data;
  const expiring = summary?.expiring || [];

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["warehouse", "items", search, category, stock, page],
    queryFn: () =>
      AvitcenaAdmin.getWarehouseItems({
        search,
        category,
        stock: stock || undefined,
        include_inactive: isAdmin,
        page,
        per_page: perPage,
      }),
    enabled: tab === "items",
    keepPreviousData: true,
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["warehouse", "movements", movementType, range?.[0]?.format(), range?.[1]?.format(), search, movementsPage],
    queryFn: () =>
      AvitcenaAdmin.getStockMovements({
        type: movementType,
        date_from: range?.[0]?.format("YYYY-MM-DD"),
        date_to: range?.[1]?.format("YYYY-MM-DD"),
        search,
        page: movementsPage,
        per_page: perPage,
      }),
    enabled: tab === "movements",
    keepPreviousData: true,
  });

  const items = itemsData?.data || [];
  const movements = movementsData?.data || [];

  const openMovement = (type: StockMovementType, item?: WarehouseItem) =>
    setMovementModal({ open: true, type, item });

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-[30px] mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">Ombor</h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Dori va materiallar qoldig'i, kirim va chiqimlar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => setItemModal({ open: true, item: null })}
              className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] border border-[#0D9488] text-[#0D9488] text-[13px] cursor-pointer"
            >
              <FiPlus /> Mahsulot qo'shish
            </button>
          )}
          <button
            onClick={() => openMovement("in")}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] bg-[#0D9488] text-white text-[13px] cursor-pointer"
          >
            <LuPackagePlus /> Kirim qilish
          </button>
          <button
            onClick={() => openMovement("out")}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] bg-[#E5484D] text-white text-[13px] cursor-pointer"
          >
            <LuPackageMinus /> Chiqim qilish
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 md:grid-cols-3 grid-cols-2 gap-3 mb-4">
        {[
          { label: "Mahsulotlar", value: summary?.items_count ?? "—" },
          {
            label: "Kam qolgan",
            value: summary?.low_stock_count ?? "—",
            onClick: () => {
              setTab("items");
              setStock("low");
              setPage(1);
            },
          },
          {
            label: "Tugagan",
            value: summary?.out_of_stock_count ?? "—",
            onClick: () => {
              setTab("items");
              setStock("out");
              setPage(1);
            },
          },
          { label: "Ombor qiymati", value: summary ? money(summary.stock_value) : "—" },
          { label: "Bu oy kirim", value: summary ? money(summary.month_in_value) : "—" },
        ].map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            disabled={!card.onClick}
            className="text-left border bg-white border-[#E8E8E8] rounded-[10px] px-4 py-3 enabled:cursor-pointer enabled:hover:shadow-md"
          >
            <p className="text-[12px] text-[#8F99A3]">{card.label}</p>
            <p className="text-[20px] font-[700]">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 flex-wrap border-b border-[#ECEFF1] mb-4">
        {(
          [
            { key: "items", label: "Mahsulotlar" },
            { key: "movements", label: "Harakatlar tarixi" },
            { key: "expiring", label: `Muddati yaqin ${expiring.length || ""}` },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[14px] font-[500] border-b-2 -mb-[1px] cursor-pointer ${
              tab === t.key
                ? "border-[#0D9488] text-[#0D9488]"
                : "border-transparent text-[#8F99A3] hover:text-[#44525C]"
            }`}
          >
            {t.label.trim()}
          </button>
        ))}
      </div>

      {tab !== "expiring" && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
              setMovementsPage(1);
            }}
            allowClear
            aria-label="Omborni qidirish"
            prefix={<LuSearch className="text-[#A9B2B8] mr-1" />}
            placeholder={tab === "items" ? "Mahsulot nomi..." : "Mahsulot, yetkazib beruvchi, izoh..."}
            className="md:!w-[280px] !h-[38px]"
          />
          {tab === "items" ? (
            <>
              <Select
                aria-label="Mahsulot turi"
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
                allowClear
                placeholder="Turi: Barchasi"
                options={CATEGORIES}
                className="!min-w-[170px] !h-[38px]"
              />
              {[
                { value: "" as const, label: "Barchasi" },
                { value: "low" as const, label: "Kam qolgan" },
                { value: "out" as const, label: "Tugagan" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStock(option.value);
                    setPage(1);
                  }}
                  className={`px-3 h-[38px] border border-[#eaeaea] rounded-[6px] text-[13px] cursor-pointer ${
                    stock === option.value ? "bg-[#0D9488] text-white" : "text-black"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <Select
                aria-label="Harakat turi"
                value={movementType}
                onChange={(v) => {
                  setMovementType(v);
                  setMovementsPage(1);
                }}
                allowClear
                placeholder="Turi: Barchasi"
                options={(Object.keys(MOVEMENT_LABELS) as StockMovementType[]).map((key) => ({
                  value: key,
                  label: MOVEMENT_LABELS[key].label,
                }))}
                className="!min-w-[190px] !h-[38px]"
              />
              <DatePicker.RangePicker
                value={range}
                onChange={(values) => {
                  setRange(values && values[0] && values[1] ? [values[0], values[1]] : null);
                  setMovementsPage(1);
                }}
                format="DD.MM.YYYY"
                className="!h-[38px]"
              />
            </>
          )}
        </div>
      )}

      {tab === "items" &&
        (itemsLoading ? (
          <div className="flex justify-center py-16">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
            {search || category || stock
              ? "Tanlangan filtrlar bo'yicha mahsulot topilmadi"
              : isAdmin
              ? "Omborda hali mahsulot yo'q. \"Mahsulot qo'shish\" tugmasi bilan boshlang"
              : "Omborda hali mahsulot yo'q. Mahsulotlarni admin qo'shadi"}
          </div>
        ) : (
          <div className="border bg-white border-[#E8E8E8] rounded-[10px] overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[760px]">
              <thead>
                <tr className="text-[11px] text-[#8F99A3] border-b border-[#F0F2F3]">
                  <th className="px-4 py-2.5 font-[600]">MAHSULOT</th>
                  <th className="px-4 py-2.5 font-[600] text-right">QOLDIQ</th>
                  <th className="px-4 py-2.5 font-[600] text-right">MINIMAL</th>
                  <th className="px-4 py-2.5 font-[600] text-right">OXIRGI NARX</th>
                  <th className="px-4 py-2.5 font-[600] text-right">QIYMATI</th>
                  <th className="px-4 py-2.5 font-[600]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setOpenItemId(item.id)}
                    className={`border-b border-[#F7F8F9] hover:bg-[#F9FAFB] cursor-pointer ${
                      item.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-[600]">{item.name}</p>
                      <p className="text-[11px] text-[#8F99A3]">
                        {item.category_display}
                        {!item.is_active && " · nofaol"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-[600]">
                        {qty(item.quantity)} {item.unit}
                      </span>
                      {STOCK_BADGE[item.stock_status] && (
                        <span className="block mt-0.5">
                          <Badge className={STOCK_BADGE[item.stock_status]!.className}>
                            {STOCK_BADGE[item.stock_status]!.label}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#64727B]">
                      {qty(item.min_quantity)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">{money(item.last_price)}</td>
                    <td className="px-4 py-3 text-right font-[600]">{money(item.value)}</td>
                    <td className="px-4 py-3">
                      {item.is_active && (
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            aria-label={`${item.name} kirim`}
                            title="Kirim"
                            onClick={() => openMovement("in", item)}
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] bg-[#E9FBF4] text-[#0D9488] cursor-pointer"
                          >
                            <LuPackagePlus />
                          </button>
                          <button
                            aria-label={`${item.name} chiqim`}
                            title="Chiqim"
                            onClick={() => openMovement("out", item)}
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] bg-[#FFECEC] text-[#E5484D] cursor-pointer"
                          >
                            <LuPackageMinus />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(itemsData?.meta?.total_items ?? 0) > perPage && (
              <div className="flex justify-end px-4 py-3">
                <Pagination
                  current={page}
                  pageSize={perPage}
                  total={itemsData?.meta.total_items}
                  onChange={setPage}
                  size="small"
                />
              </div>
            )}
          </div>
        ))}

      {tab === "movements" &&
        (movementsLoading ? (
          <div className="flex justify-center py-16">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : movements.length === 0 ? (
          <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
            Harakatlar topilmadi
          </div>
        ) : (
          <div className="border bg-white border-[#E8E8E8] rounded-[10px]">
            <MovementsTable movements={movements} showItem />
            {(movementsData?.meta?.total_items ?? 0) > perPage && (
              <div className="flex justify-end px-4 py-3">
                <Pagination
                  current={movementsPage}
                  pageSize={perPage}
                  total={movementsData?.meta.total_items}
                  onChange={setMovementsPage}
                  size="small"
                />
              </div>
            )}
          </div>
        ))}

      {tab === "expiring" &&
        (expiring.length === 0 ? (
          <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
            Keyingi {summary?.expiry_warning_days ?? 30} kunda muddati tugaydigan mahsulot yo'q
          </div>
        ) : (
          <div className="border bg-white border-[#E8E8E8] rounded-[10px] overflow-x-auto">
            <p className="text-[12px] text-[#8F99A3] px-4 pt-3">
              Qoldig'i bor mahsulotlarning {summary?.expiry_warning_days} kun ichida muddati
              tugaydigan kirimlari
            </p>
            <table className="w-full text-left text-[13px] min-w-[600px]">
              <thead>
                <tr className="text-[11px] text-[#8F99A3] border-b border-[#F0F2F3]">
                  <th className="px-4 py-2.5 font-[600]">MAHSULOT</th>
                  <th className="px-4 py-2.5 font-[600]">MUDDATI</th>
                  <th className="px-4 py-2.5 font-[600] text-right">KIRIM</th>
                  <th className="px-4 py-2.5 font-[600]">YETKAZIB BERUVCHI</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map((m) => {
                  const daysLeft = dayjs(m.expiry_date).startOf("day").diff(dayjs().startOf("day"), "day");
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setOpenItemId(m.item)}
                      className="border-b border-[#F7F8F9] hover:bg-[#F9FAFB] cursor-pointer"
                    >
                      <td className="px-4 py-3 font-[600]">{m.item_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dayjs(m.expiry_date).format("DD.MM.YYYY")}{" "}
                        <Badge
                          className={
                            daysLeft < 0 ? "bg-[#FFECEC] text-[#E5484D]" : "bg-[#FFF4E0] text-[#B26A00]"
                          }
                        >
                          {daysLeft < 0 ? "Muddati o'tgan" : daysLeft === 0 ? "Bugun" : `${daysLeft} kun qoldi`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {qty(m.change)} {m.unit} · {dayjs(m.date).format("DD.MM.YYYY")}
                      </td>
                      <td className="px-4 py-3 text-[#64727B]">{m.supplier || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

      <MovementModal
        open={movementModal.open}
        initialType={movementModal.type}
        initialItem={movementModal.item}
        onClose={() => setMovementModal((prev) => ({ ...prev, open: false }))}
        notify={notify}
      />

      <ItemModal
        open={itemModal.open}
        item={itemModal.item}
        onClose={() => setItemModal({ open: false, item: null })}
        notify={notify}
      />

      <ItemDrawer
        itemId={openItemId}
        onClose={() => setOpenItemId(null)}
        isAdmin={isAdmin}
        onMove={(type, item) => openMovement(type, item)}
        onEdit={(item) => setItemModal({ open: true, item })}
        notify={notify}
      />
    </div>
  );
}
