import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  Modal,
  notification,
  Popconfirm,
  Spin,
  Switch,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { AvitcenaAdmin } from "../queries/query";
import {
  FiCheck,
  FiDownload,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  TbCategoryPlus,
  TbStethoscope,
  TbHeartbeat,
  TbBabyCarriage,
  TbBrain,
  TbWaveSine,
  TbFlask2,
  TbDental,
  TbSparkles,
} from "react-icons/tb";

type ServiceDoctor = {
  id: string;
  fio: string;
};

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
  is_active: boolean;
  doctors: ServiceDoctor[];
};

type CategoryListItem = {
  id: string;
  name: string;
  services: ServiceItem[];
};

type CategoryDetail = {
  id: string;
  name: string;
  services: ServiceItem[];
  service_count: number;
  active_count: number;
  doctor_count: number;
  price_min: number | null;
  price_max: number | null;
};

type ServicesStats = {
  total_categories: number;
  total_services: number;
  average_price: number;
  most_popular_service: string | null;
};

const CATEGORY_COLORS = [
  { bg: "#F3E8FF", text: "#9333EA" },
  { bg: "#FCE7F3", text: "#DB2777" },
  { bg: "#DBEAFE", text: "#2563EB" },
  { bg: "#DCFCE7", text: "#16A34A" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#E0F2FE", text: "#0891B2" },
];

function getCategoryStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("gin")) return TbStethoscope;
  if (n.includes("kardio")) return TbHeartbeat;
  if (n.includes("pediatr") || n.includes("bola")) return TbBabyCarriage;
  if (n.includes("nevro") || n.includes("невро")) return TbBrain;
  if (n.includes("uzi") || n.includes("узи") || n.includes("diagnost"))
    return TbWaveSine;
  if (n.includes("laborator") || n.includes("лаборатор")) return TbFlask2;
  if (n.includes("stomatolog") || n.includes("стоматолог")) return TbDental;
  return TbSparkles;
}

function getInitials(fio: string) {
  const parts = fio.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

export default function Services() {
  type NotificationType = "success" | "info" | "warning" | "error";
  const [api, contextHolder] = notification.useNotification();
  const openNotificationWithIcon = (
    type: NotificationType,
    message: string,
    desc: string
  ) => {
    api[type]({ message, description: desc });
  };

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: statsData } = useQuery<{ success: boolean; data: ServicesStats }>({
    queryKey: ["servicesStats"],
    queryFn: () => AvitcenaAdmin.getServicesStats(),
  });

  const { data: categoryListData, isLoading: categoriesLoading } = useQuery<{
    data: CategoryListItem[];
  }>({
    queryKey: ["getCategorylist", 1, 100],
    queryFn: () => AvitcenaAdmin.getCategorylist(1, 100),
    keepPreviousData: true,
  });

  const categories = categoryListData?.data || [];

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const {
    data: categoryDetailData,
    isLoading: categoryDetailLoading,
  } = useQuery<{ data: CategoryDetail }>({
    queryKey: ["getCategory", selectedCategoryId],
    queryFn: () => AvitcenaAdmin.getOneCategory(selectedCategoryId as string),
    enabled: !!selectedCategoryId,
  });

  const categoryDetail = categoryDetailData?.data;

  const refreshAll = () => {
    queryClient.invalidateQueries(["getCategorylist"]);
    queryClient.invalidateQueries(["getCategory", selectedCategoryId]);
    queryClient.invalidateQueries(["servicesStats"]);
    queryClient.invalidateQueries(["services"]);
  };

  // Yangi kategoriya qo'shish
  const { mutate: addCategoryMutate, isLoading: addCategoryLoading } =
    useMutation((obj: { name: string }) => AvitcenaAdmin.addCategory(obj), {
      onSuccess: (data: any) => {
        setNewCategoryName("");
        refreshAll();
        setSelectedCategoryId(data?.data?.id || null);
        openNotificationWithIcon(
          "success",
          "Kategoriya qo'shildi",
          "Yangi kategoriya muvaffaqiyatli yaratildi!"
        );
      },
      onError: () => {
        openNotificationWithIcon(
          "error",
          "Xatolik yuz berdi",
          "Bu kategoriya allaqachon mavjud bo'lishi mumkin."
        );
      },
    });

  // Kategoriya nomini tahrirlash
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [categoryEditName, setCategoryEditName] = useState("");

  const { mutate: updateCategoryMutate, isLoading: updateCategoryLoading } =
    useMutation(
      (data: { id: string; name: string }) =>
        AvitcenaAdmin.updateCategory(data.id, { name: data.name }),
      {
        onSuccess: () => {
          setCategoryEditMode(false);
          refreshAll();
          openNotificationWithIcon(
            "success",
            "Saqlandi",
            "Kategoriya nomi o'zgartirildi!"
          );
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Saqlab bo'lmadi",
            "Bu nomli kategoriya allaqachon mavjud bo'lishi mumkin."
          );
        },
      }
    );

  const saveCategoryName = (category: { id: string; name: string }) => {
    const name = categoryEditName.trim();

    if (!name) {
      openNotificationWithIcon(
        "error",
        "Saqlab bo'lmadi",
        "Kategoriya nomini kiriting."
      );
      return;
    }

    if (name === category.name) {
      setCategoryEditMode(false);
      return;
    }

    updateCategoryMutate({ id: category.id, name });
  };

  // Kategoriyani o'chirish
  const { mutate: deleteCategoryMutate } = useMutation(
    (id: string) => AvitcenaAdmin.deleteCategory(id),
    {
      onSuccess: () => {
        setSelectedCategoryId(null);
        refreshAll();
        openNotificationWithIcon(
          "success",
          "O'chirildi",
          "Kategoriya muvaffaqiyatli o'chirildi!"
        );
      },
      onError: () => {
        openNotificationWithIcon(
          "error",
          "Xatolik yuz berdi",
          "Kategoriyani o'chirib bo'lmadi, unda xizmatlar mavjud bo'lishi mumkin."
        );
      },
    }
  );

  // Yangi xizmat qo'shish
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [addServiceForm] = Form.useForm();

  const { mutate: addServicesMutate, isLoading: addServicesLoading } =
    useMutation(
      (obj: {
        category: string;
        services: { name: string; price: number; duration_minutes?: number | null }[];
      }) => AvitcenaAdmin.addServices(obj),
      {
        onSuccess: () => {
          addServiceForm.resetFields();
          setAddServiceModalOpen(false);
          refreshAll();
          openNotificationWithIcon(
            "success",
            "Xizmat qo'shildi",
            "Yangi xizmat muvaffaqiyatli qo'shildi!"
          );
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi",
            "Bu nomli xizmat allaqachon mavjud bo'lishi mumkin."
          );
        },
      }
    );

  // Xizmatni tahrirlash
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editServiceForm] = Form.useForm();

  useEffect(() => {
    if (editingService) {
      editServiceForm.setFieldsValue({
        name: editingService.name,
        price: editingService.price,
        duration_minutes: editingService.duration_minutes,
      });
    }
  }, [editingService]);

  const { mutate: editServiceMutate, isLoading: editServiceLoading } =
    useMutation(
      (data: { id: string; obj: any }) =>
        AvitcenaAdmin.editService(data.id, data.obj),
      {
        onSuccess: (_data, variables) => {
          setEditingService(null);
          refreshAll();

          // Faol/nofaol tugmasi uchun xabar chiqarmaymiz
          if (variables.obj.name) {
            openNotificationWithIcon(
              "success",
              "Saqlandi",
              "Xizmat ma'lumotlari o'zgartirildi!"
            );
          }
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Saqlab bo'lmadi",
            "Bu nomli xizmat shu kategoriyada allaqachon mavjud bo'lishi mumkin."
          );
        },
      }
    );

  // Xizmatni faol/nofaol qilish
  const toggleServiceActive = (service: ServiceItem) => {
    editServiceMutate({
      id: service.id,
      obj: { is_active: !service.is_active },
    });
  };

  // Xizmatni o'chirish
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null
  );
  const { mutate: deleteServiceMutate } = useMutation(
    (id: string) => AvitcenaAdmin.deleteService(id),
    {
      onSuccess: () => {
        setDeletingServiceId(null);
        refreshAll();
      },
      onError: () => {
        setDeletingServiceId(null);
      },
    }
  );

  const handleDeleteService = (id: string) => {
    setDeletingServiceId(id);
    deleteServiceMutate(id);
  };

  // Narxlar ro'yxatini PDF (brauzer chop etish) ko'rinishida eksport qilish
  const handleExportPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const rows = categories
      .map(
        (cat) => `
        <h3>${cat.name}</h3>
        <table>
          <thead>
            <tr><th>Xizmat nomi</th><th>Narx</th></tr>
          </thead>
          <tbody>
            ${cat.services
              .map(
                (s) =>
                  `<tr><td>${s.name}</td><td>${s.price.toLocaleString()} so'm</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Narxlar ro'yxati</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; }
            h3 { margin-top: 24px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
            th { background: #F9FAFB; }
          </style>
        </head>
        <body>
          <h1>Xizmatlar narxlar ro'yxati</h1>
          ${rows}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const stats = statsData?.data;

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mt-4 text-[13px]">
        <Link to="/dashboard" className="text-[#8F99A3] hover:text-[#44525C]">
          Bosh sahifa
        </Link>
        <span className="text-[#C7CED3]">/</span>
        <span className="font-[500] text-[#44525C]">Xizmatlar</span>
      </div>

      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-3 mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Xizmatlar va kategoriyalar
          </h1>
          <p className="text-[#8F99A3] text-[14px] md:text-[16px]">
            Klinika xizmat kategoriyalari va narxlarini boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiDownload /> Narxlar ro'yxati (PDF)
          </button>
          <button
            onClick={() =>
              document.getElementById("new-category-input")?.focus()
            }
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <TbCategoryPlus /> Kategoriya qo'shish
          </button>
          <button
            onClick={() => {
              if (!selectedCategoryId) return;
              setAddServiceModalOpen(true);
            }}
            disabled={!selectedCategoryId}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] bg-[#0D9488] hover:bg-[#0C8377] transition-colors text-white text-[13px] font-[500] cursor-pointer disabled:opacity-50"
          >
            <FiPlus /> Xizmat qo'shish
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 grid-cols-2 gap-3 mb-4">
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Kategoriyalar</p>
          <p className="text-[18px] font-[700]">
            {stats?.total_categories ?? "—"}
          </p>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Jami xizmatlar</p>
          <p className="text-[18px] font-[700]">
            {stats?.total_services ?? "—"}
          </p>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">O'rtacha narx</p>
          <p className="text-[16px] font-[700]">
            {stats ? Math.round(stats.average_price).toLocaleString() : "—"}{" "}
            so'm
          </p>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Eng ommabop</p>
          <p className="text-[13px] font-[700] truncate">
            {stats?.most_popular_service || "Hali ma'lumot yo'q"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 items-start">
        {/* LEFT: Categories list */}
        <div className="md:col-span-4 col-span-12">
          <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TbCategoryPlus className="text-[#0D9488] text-[18px]" />
              <h3 className="font-[600] text-[15px]">
                Kategoriyalar {categories.length}
              </h3>
            </div>

            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A9B2B8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kategoriya qidirish..."
                className="w-full h-[38px] pl-9 rounded-[8px] border border-[#E0E6EB] outline-none text-[13px] focus:border-[#0D9488]"
              />
            </div>

            {categoriesLoading ? (
              <div className="flex justify-center py-6">
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[432px] overflow-y-auto">
                {filteredCategories.map((cat) => {
                  const style = getCategoryStyle(cat.id);
                  const Icon = getCategoryIcon(cat.name);
                  const active = cat.id === selectedCategoryId;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryEditMode(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                        active ? "bg-[#E9FBF4]" : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-[32px] h-[32px] shrink-0 rounded-[8px] flex items-center justify-center"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          <Icon className="text-[16px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-[500] truncate">
                            {cat.name}
                          </span>
                          <span className="block text-[11px] text-[#8F99A3]">
                            {cat.services.length} ta xizmat
                          </span>
                        </span>
                      </span>
                      <span
                        className={`text-[11px] font-[700] px-1.5 py-0.5 rounded-full ${
                          active
                            ? "bg-[#0D9488] text-white"
                            : "bg-[#F1F5F4] text-[#64727B]"
                        }`}
                      >
                        {cat.services.length}
                      </span>
                    </button>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <p className="text-[13px] text-[#8F99A3] text-center py-4">
                    Kategoriya topilmadi
                  </p>
                )}
              </div>
            )}

            {/* Yangi kategoriya */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F2F3]">
              <input
                id="new-category-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    addCategoryMutate({ name: newCategoryName.trim() });
                  }
                }}
                placeholder="Yangi kategoriya"
                className="flex-1 h-[38px] px-3 rounded-[8px] border border-[#E0E6EB] outline-none text-[13px] focus:border-[#0D9488]"
              />
              <button
                onClick={() =>
                  newCategoryName.trim() &&
                  addCategoryMutate({ name: newCategoryName.trim() })
                }
                className="flex items-center gap-1 px-3 h-[38px] rounded-[8px] bg-[#0D9488] text-white text-[13px] font-[500] cursor-pointer shrink-0"
              >
                {addCategoryLoading ? (
                  <Spin indicator={<LoadingOutlined spin />} />
                ) : (
                  <>
                    <FiPlus /> Qo'shish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Category detail */}
        <div className="md:col-span-8 col-span-12">
          <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] p-4 min-h-[300px] relative">
            {categoryDetailLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <Spin indicator={<LoadingOutlined spin />} size="large" />
              </div>
            )}

            {!selectedCategoryId || !categoryDetail ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#8F99A3]">
                <TbCategoryPlus className="text-[32px] mb-2" />
                Chapdan kategoriya tanlang
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-[44px] h-[44px] shrink-0 rounded-[10px] flex items-center justify-center"
                      style={{
                        backgroundColor: getCategoryStyle(categoryDetail.id).bg,
                        color: getCategoryStyle(categoryDetail.id).text,
                      }}
                    >
                      {(() => {
                        const Icon = getCategoryIcon(categoryDetail.name);
                        return <Icon className="text-[20px]" />;
                      })()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {categoryEditMode ? (
                          <Input
                            size="small"
                            value={categoryEditName}
                            onChange={(e) => setCategoryEditName(e.target.value)}
                            onPressEnter={() => saveCategoryName(categoryDetail)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setCategoryEditMode(false);
                            }}
                            autoFocus
                            aria-label="Kategoriya nomi"
                            className="!w-[200px]"
                          />
                        ) : (
                          <h3 className="font-[600] text-[16px] truncate">
                            {categoryDetail.name}
                          </h3>
                        )}
                        <span
                          className={`text-[10px] font-[600] px-2 py-0.5 rounded-full shrink-0 ${
                            categoryDetail.active_count > 0
                              ? "bg-[#E9FBF4] text-[#0D9488]"
                              : "bg-[#F1F5F4] text-[#64727B]"
                          }`}
                        >
                          {categoryDetail.active_count > 0 ? "Faol" : "Bo'sh"}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8F99A3]">
                        {categoryDetail.service_count} ta xizmat ·{" "}
                        {categoryDetail.doctor_count} ta shifokor biriktirilgan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {categoryEditMode ? (
                      <>
                        <button
                          onClick={() => saveCategoryName(categoryDetail)}
                          disabled={updateCategoryLoading}
                          title="Saqlash"
                          aria-label="Kategoriya nomini saqlash"
                          className="flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] bg-[#0D9488] text-white text-[12px] font-[500] cursor-pointer disabled:opacity-70"
                        >
                          {updateCategoryLoading ? (
                            <Spin indicator={<LoadingOutlined spin />} />
                          ) : (
                            <FiCheck />
                          )}
                          Saqlash
                        </button>
                        <button
                          onClick={() => setCategoryEditMode(false)}
                          title="Bekor qilish"
                          aria-label="Tahrirlashni bekor qilish"
                          className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] border border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB] cursor-pointer"
                        >
                          <FiX />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setCategoryEditName(categoryDetail.name);
                          setCategoryEditMode(true);
                        }}
                        title="Nomini tahrirlash"
                        aria-label="Kategoriya nomini tahrirlash"
                        className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] border border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB] cursor-pointer"
                      >
                        <FiEdit2 />
                      </button>
                    )}

                    <Popconfirm
                      title="Kategoriyani o'chirish"
                      description="Haqiqatan ham o'chirmoqchimisiz?"
                      onConfirm={() => deleteCategoryMutate(categoryDetail.id)}
                      okText="Ha"
                      cancelText="Yo'q"
                    >
                      <button className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] border border-[#FDEDED] text-[#E24C4C] hover:bg-[#FDEDED] cursor-pointer">
                        <FiTrash2 />
                      </button>
                    </Popconfirm>

                    <button
                      onClick={() => setAddServiceModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 h-[32px] rounded-[8px] bg-[#0D9488] text-white text-[12px] font-[500] cursor-pointer"
                    >
                      <FiPlus /> Xizmat qo'shish
                    </button>
                  </div>
                </div>

                {/* Services table */}
                {categoryDetail.services.length === 0 ? (
                  <p className="text-[13px] text-[#8F99A3] text-center py-10">
                    Bu kategoriyada hali xizmat yo'q
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[432px] overflow-y-auto">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 bg-white z-[1]">
                        <tr className="text-[11px] text-[#8F99A3] text-left border-b border-[#F0F2F3]">
                          <th className="py-1.5 font-[500]">Xizmat nomi</th>
                          <th className="py-1.5 font-[500]">Shifokorlar</th>
                          <th className="py-1.5 font-[500]">Davomiyligi</th>
                          <th className="py-1.5 font-[500]">Narx</th>
                          <th className="py-1.5 font-[500]">Faol</th>
                          <th className="py-1.5 font-[500]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryDetail.services.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-[#F7F8F9] last:border-none"
                          >
                            <td className="py-1.5 font-[500]">{s.name}</td>
                            <td className="py-1.5">
                              {s.doctors.length === 0 ? (
                                <span className="text-[#C7CED3]">—</span>
                              ) : (
                                <div className="flex items-center -space-x-1.5">
                                  {s.doctors.slice(0, 2).map((d) => (
                                    <span
                                      key={d.id}
                                      title={d.fio}
                                      className="w-[22px] h-[22px] rounded-full bg-[#E7F0FA] text-[#2A81D8] text-[9px] font-[700] flex items-center justify-center border border-white"
                                    >
                                      {getInitials(d.fio)}
                                    </span>
                                  ))}
                                  {s.doctors.length > 2 && (
                                    <span className="text-[11px] text-[#8F99A3] pl-2">
                                      +{s.doctors.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 text-[#64727B]">
                              {s.duration_minutes
                                ? `${s.duration_minutes} daq`
                                : "—"}
                            </td>
                            <td className="py-1.5 font-[600]">
                              {s.price.toLocaleString()} so'm
                            </td>
                            <td className="py-1.5">
                              <Switch
                                size="small"
                                checked={s.is_active}
                                onChange={() => toggleServiceActive(s)}
                              />
                            </td>
                            <td className="py-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingService(s)}
                                  title="Xizmatni tahrirlash"
                                  aria-label={`${s.name} xizmatini tahrirlash`}
                                  className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#44525C] hover:bg-[#F9FAFB] cursor-pointer"
                                >
                                  <FiEdit2 className="text-[13px]" />
                                </button>
                                <Popconfirm
                                  title="Xizmatni o'chirish"
                                  description="Haqiqatan ham o'chirmoqchimisiz?"
                                  onConfirm={() => handleDeleteService(s.id)}
                                  okText="Ha"
                                  cancelText="Yo'q"
                                >
                                  <button className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[#E24C4C] hover:bg-[#FDEDED] cursor-pointer">
                                    {deletingServiceId === s.id ? (
                                      <Spin
                                        indicator={<LoadingOutlined spin />}
                                      />
                                    ) : (
                                      <FiTrash2 className="text-[13px]" />
                                    )}
                                  </button>
                                </Popconfirm>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={() => setAddServiceModalOpen(true)}
                  className="w-full mt-3 py-2.5 rounded-[8px] border border-dashed border-[#E0E6EB] text-[13px] text-[#0D9488] font-[500] hover:bg-[#F9FAFB] cursor-pointer"
                >
                  + {categoryDetail.name} kategoriyasiga yangi xizmat qo'shish
                </button>

                {categoryDetail.services.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0F2F3] text-[12px] text-[#8F99A3]">
                    <span>
                      {categoryDetail.service_count} ta xizmat ·{" "}
                      {categoryDetail.active_count} ta faol
                    </span>
                    <span>
                      Narx oralig'i:{" "}
                      {categoryDetail.price_min?.toLocaleString()} -{" "}
                      {categoryDetail.price_max?.toLocaleString()} so'm
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add service modal */}
      <Modal
        title="Yangi xizmat qo'shish"
        open={addServiceModalOpen}
        onCancel={() => setAddServiceModalOpen(false)}
        footer={false}
        centered
      >
        <Form
          form={addServiceForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedCategoryId) return;
            addServicesMutate({
              category: selectedCategoryId,
              services: [
                {
                  name: values.name,
                  price: Number(values.price),
                  duration_minutes: values.duration_minutes
                    ? Number(values.duration_minutes)
                    : null,
                },
              ],
            });
          }}
        >
          <Form.Item
            name="name"
            label="Xizmat nomi"
            rules={[{ required: true, message: "Xizmat nomini kiriting!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="price"
            label="Narxi (so'm)"
            rules={[{ required: true, message: "Narxini kiriting!" }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item name="duration_minutes" label="Davomiyligi (daqiqa)">
            <Input type="number" placeholder="Masalan: 30" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            style={{ background: "#0D9488" }}
          >
            {addServicesLoading ? (
              <Spin indicator={<LoadingOutlined spin />} />
            ) : (
              "Saqlash"
            )}
          </Button>
        </Form>
      </Modal>

      {/* Edit service modal */}
      <Modal
        title="Xizmatni tahrirlash"
        open={!!editingService}
        onCancel={() => setEditingService(null)}
        footer={false}
        centered
      >
        <Form
          form={editServiceForm}
          layout="vertical"
          onFinish={(values) => {
            if (!editingService) return;
            editServiceMutate({
              id: editingService.id,
              obj: {
                name: values.name.trim(),
                category: categoryDetail?.id,
                price: Number(values.price),
                duration_minutes: values.duration_minutes
                  ? Number(values.duration_minutes)
                  : null,
              },
            });
          }}
        >
          <Form.Item
            name="name"
            label="Xizmat nomi"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Xizmat nomini kiriting!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="price"
            label="Narxi (so'm)"
            rules={[{ required: true, message: "Narxini kiriting!" }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item name="duration_minutes" label="Davomiyligi (daqiqa)">
            <Input type="number" placeholder="Masalan: 30" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            style={{ background: "#0D9488" }}
          >
            {editServiceLoading ? (
              <Spin indicator={<LoadingOutlined spin />} />
            ) : (
              "Saqlash"
            )}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
