import { FiCamera, FiLock } from "react-icons/fi";
import { LuBriefcase, LuUser } from "react-icons/lu";
import { LoadingOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, notification, Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  ChangePasswordPayload,
  ChangePasswordResponse,
  AvitcenaAdmin,
} from "../queries/query";
import { useEffect, useState } from "react";

export interface Category {
  id: string;
  name: string;
  services: { id: string; name: string; price: number }[];
}

export interface Doctor {
  categories: Category;
  experience_year: number;
  patients_stats: string;
}

export interface UserProfile {
  id: string;
  access_token: string;
  refresh_token: string;
  fio: string;
  username: string;
  role: "admin" | "doctor" | "user"; // agar role fixed bo‘lsa union qildim
  phone: string;
  doctor: Doctor | null;
  status: string;
  more: string | null;
  clinic_name: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface DoctorPayload {
  experience_year?: number;
  services?: string[]; // services Select dan keladigan value lar
}

export interface UpdateProfilePayload {
  fio?: string;
  username?: string;
  phone?: string;
  role?: string;
  more?: string;
  doctor?: DoctorPayload;
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  registrator: "Registrator",
  doctor: "Shifokor",
  superadmin: "Super Admin",
};

function getInitials(fio: string) {
  return fio
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Settings() {
  type NotificationType = "success" | "info" | "warning" | "error";

  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIcon = (
    type: NotificationType,
    message: string,
    desc: string
  ) => {
    api[type]({
      message: message,
      description: desc,
    });
  };

  const queryClient = useQueryClient();

  // Parol modali
  const [isModalPassOpen, setIsModalPassOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const showModalPass = () => {
    setIsModalPassOpen(true);
  };

  const handleOkPass = () => {
    setIsModalPassOpen(false);
  };

  const handleCancelPass = () => {
    setIsModalPassOpen(false);
  };

  // Profil forma maydonlari (fio bitta maydon sifatida saqlanadi, uchta bo'lakka bo'lib ko'rsatiladi)
  const [familiya, setFamiliya] = useState("");
  const [ism, setIsm] = useState("");
  const [otasiningIsmi, setOtasiningIsmi] = useState("");
  const [phone, setPhone] = useState("");

  // Query orqali user profile malumotlarini olish
  const { data: getUserProfileData } = useQuery<UserProfileResponse>({
    queryKey: ["getUserProfile"],
    queryFn: () => AvitcenaAdmin.getUserProfile(),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const resetFieldsFromProfile = () => {
    const profile = getUserProfileData?.data;

    if (!profile) return;

    const parts = (profile.fio || "").trim().split(/\s+/).filter(Boolean);

    setFamiliya(parts[0] || "");
    setIsm(parts[1] || "");
    setOtasiningIsmi(parts.slice(2).join(" "));
    setPhone(profile.phone || "");
  };

  useEffect(() => {
    resetFieldsFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUserProfileData]);

  const { mutate: updateProfileMutate, isLoading: updateProfileDataLoading } =
    useMutation<UserProfileResponse, Error, UpdateProfilePayload>(
      (obj) => AvitcenaAdmin.updateProfileData(obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["getUserProfile"]);
          openNotificationWithIcon(
            "success",
            "Profil yangilandi",
            "Profil yangilanishi muvaffaqiyatli bo'ldi!"
          );
          setIsEditing(false);
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi!",
            "Profil yangilanmadi, qaytadan urinib ko'ring!"
          );
        },
      }
    );

  const { mutate: changePassword, isLoading: changingPassword } = useMutation<
    ChangePasswordResponse,
    unknown,
    ChangePasswordPayload
  >((payload) => AvitcenaAdmin.changePassword(payload), {
    onSuccess: () => {
      openNotificationWithIcon(
        "success",
        "Parol yangilandi",
        "Parolni yodda saqladingiz degan umiddaman!"
      );
      setIsModalPassOpen(false);
    },
    onError: () => {
      openNotificationWithIcon(
        "error",
        "Xatolik yuz berdi!",
        "Parol yangilanmadi qaytadan urinib ko'ring!"
      );
    },
  });

  const handlePasswordSave = (values: any) => {
    changePassword({
      old_password: values.oldPassword,
      new_password: values.newPassword,
    });
  };

  const handleCancelEdit = () => {
    resetFieldsFromProfile();
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    const fio = [familiya, ism, otasiningIsmi]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    updateProfileMutate({ fio, phone });
  };

  const profile = getUserProfileData?.data;
  const fullName = [familiya, ism].filter(Boolean).join(" ") || profile?.fio || "";
  const roleLabel = profile?.role ? roleLabels[profile.role] || profile.role : "";

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}
      <div className="flex items-center justify-between mt-[30px]">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Sozlamalar paneli
          </h1>
          <p className="text-[#8F99A3] text-[14px] md:text-[16px]">
            Profil sozlamalari va hisob xavfsizligi
          </p>
        </div>

        <div className="flex items-center gap-2 md:flex-row flex-col-reverse">
          <button
            onClick={showModalPass}
            className="cursor-pointer hover:shadow-md  text-yellow-500 border-yellow-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md text-[14px] flex gap-2 hover:bg-[#ffbc1218] transition-all duration-150"
          >
            Parolni o'zgartirish
          </button>
        </div>
      </div>

      <Modal
        title="Admin parolini o'zgartirish"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalPassOpen}
        onOk={handleOkPass}
        onCancel={handleCancelPass}
        footer={false}
      >
        <Card className="!border-none">
          <Form layout="vertical" onFinish={handlePasswordSave}>
            <Form.Item
              name="oldPassword"
              label="Eski parolingizni kiriting"
              className="col-span-6"
              rules={[{ required: true, message: "Eski parolni kiriting!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Yangi parolni kiriting"
              className="col-span-6"
              rules={[{ required: true, message: "Yangi parolni kiriting!" }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="reNewPassword"
              label="Parolni takrorlang"
              className="col-span-6"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Parolni takrorlang!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Parollar bir xil emas ❌")
                    );
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <div className="flex justify-end">
              <Button
                type="primary"
                htmlType="submit"
                className="!h-[38px] !py-2.5 !w-full hover:shadow-md transition-all duration-150"
              >
                {changingPassword ? (
                  <Spin
                    className="!text-white"
                    indicator={<LoadingOutlined spin />}
                  />
                ) : (
                  "Saqlash"
                )}
              </Button>
            </div>
          </Form>
        </Card>
      </Modal>

      {/* Profil ma'lumotlari kartasi */}
      <div className="bg-white border border-[#ECEFF1] rounded-[16px] shadow-sm p-5 md:p-6 mt-5">
        <div className="flex items-start gap-3 pb-4 mb-5 border-b border-[#F0F2F3]">
          <div className="w-[38px] h-[38px] shrink-0 rounded-[10px] bg-[#F1F5F4] text-[#44525C] flex items-center justify-center text-[18px]">
            <LuUser />
          </div>
          <div>
            <h2 className="text-[16px] font-[600] leading-tight">
              Profil ma'lumotlari
            </h2>
            <p className="text-[13px] text-[#8F99A3]">
              Bu ma'lumotlar tizimda va hisobotlarda ko'rinadi
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Avatar blok */}
          <div className="flex md:flex-col items-center md:items-start gap-3 md:w-[160px] shrink-0">
            <div className="relative">
              <div className="w-[88px] h-[88px] rounded-[20px] bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-white flex items-center justify-center text-[28px] font-[700]">
                {getInitials(fullName || "U F") || "U"}
              </div>
              <button
                type="button"
                title="Profil rasmi tez orada qo'shiladi"
                className="absolute -bottom-2 -right-2 w-[30px] h-[30px] rounded-full bg-white border border-[#ECEFF1] shadow-sm flex items-center justify-center text-[#44525C] cursor-not-allowed"
              >
                <FiCamera className="text-[13px]" />
              </button>
            </div>

            <div className="md:mt-1">
              <p className="text-[14px] font-[600] leading-tight">
                {fullName || "—"}
              </p>
              {otasiningIsmi && (
                <p className="text-[12px] text-[#8F99A3]">{otasiningIsmi}</p>
              )}
              {roleLabel && (
                <span className="inline-flex items-center gap-1.5 mt-2 bg-[#EFEAFE] text-[#7C5CFC] text-[11px] font-[600] px-2.5 py-1 rounded-full">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#7C5CFC]" />
                  {roleLabel}
                </span>
              )}
            </div>
          </div>

          {/* Forma maydonlari */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Familiya
              </label>
              <input
                value={familiya}
                onChange={(e) => setFamiliya(e.target.value)}
                disabled={!isEditing}
                className="w-full h-[42px] rounded-[10px] border border-[#E0E6EB] bg-white disabled:bg-[#F9FAFB] px-3.5 text-[14px] outline-none focus:border-[#0D9488] transition-colors disabled:text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Ism
              </label>
              <input
                value={ism}
                onChange={(e) => setIsm(e.target.value)}
                disabled={!isEditing}
                className="w-full h-[42px] rounded-[10px] border border-[#E0E6EB] bg-white disabled:bg-[#F9FAFB] px-3.5 text-[14px] outline-none focus:border-[#0D9488] transition-colors disabled:text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Otasining ismi
              </label>
              <input
                value={otasiningIsmi}
                onChange={(e) => setOtasiningIsmi(e.target.value)}
                disabled={!isEditing}
                className="w-full h-[42px] rounded-[10px] border border-[#E0E6EB] bg-white disabled:bg-[#F9FAFB] px-3.5 text-[14px] outline-none focus:border-[#0D9488] transition-colors disabled:text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Telefon raqam
              </label>
              <div
                className={`h-[42px] rounded-[10px] border border-[#E0E6EB] flex items-center px-3 gap-2 transition-colors ${
                  isEditing ? "bg-white focus-within:border-[#0D9488]" : "bg-[#F9FAFB]"
                }`}
              >
                <span className="text-[16px] leading-none">🇺🇿</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[14px] disabled:text-[#1A1A1A]"
                />
                <span className="flex items-center gap-1 text-[11px] font-[600] text-[#0D9488] bg-[#E9FBF4] px-2 py-1 rounded-full shrink-0">
                  ✓ Tasdiqlangan
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Login
              </label>
              <div className="h-[42px] rounded-[10px] border border-[#E0E6EB] bg-[#F9FAFB] flex items-center justify-between px-3.5">
                <span className="flex items-center gap-2 text-[14px] text-[#1A1A1A] truncate">
                  <LuUser className="text-[#8F99A3] shrink-0" />
                  {profile?.username ? `@${profile.username}` : ""}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#A9B2B8] shrink-0">
                  <FiLock /> O'zgarmaydi
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-[500] text-[#44525C] mb-1.5">
                Lavozim
              </label>
              <div className="h-[42px] rounded-[10px] border border-[#E0E6EB] bg-[#F9FAFB] flex items-center justify-between px-3.5">
                <span className="flex items-center gap-2 text-[14px] text-[#1A1A1A] truncate">
                  <LuBriefcase className="text-[#8F99A3] shrink-0" />
                  {roleLabel}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#A9B2B8] shrink-0">
                  <FiLock /> Faqat egasi
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-[#F0F2F3]">
          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="px-5 py-2 rounded-[10px] text-[14px] font-[500] text-[#44525C] border border-[#E0E6EB] hover:bg-[#F1F5F4] transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
          )}
          <button
            onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
            className="min-w-[140px] flex justify-center items-center gap-2 px-5 py-2 rounded-[10px] text-[14px] font-[500] text-white bg-[#0D9488] hover:bg-[#0C8377] transition-colors cursor-pointer"
          >
            {updateProfileDataLoading ? (
              <Spin
                className="!text-white"
                indicator={<LoadingOutlined spin />}
              />
            ) : isEditing ? (
              "Saqlash"
            ) : (
              "Tahrirlash"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
