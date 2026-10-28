import { FiPlus } from "react-icons/fi";
import { LoadingOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, notification, Select, Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  ChangePasswordPayload,
  ChangePasswordResponse,
  OneMedAdmin,
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

export default function Settings() {
  const [form] = Form.useForm();

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

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPassOpen, setIsModalPassOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const showModalPass = () => {
    setIsModalPassOpen(true);
  };

  const handleOkPass = () => {
    setIsModalPassOpen(false);
  };

  const handleCancelPass = () => {
    setIsModalPassOpen(false);
  };

  // Query orqali user profile malumotlarini olish
  const { data: getUserProfileData } = useQuery<UserProfileResponse>({
    queryKey: ["getUserProfile"],
    queryFn: () => OneMedAdmin.getUserProfile(),
    staleTime: Infinity,
    cacheTime: Infinity,
    enabled: !!isModalOpen,
  });

  useEffect(() => {
    if (getUserProfileData?.data) {
      form.setFieldsValue({
        fio: getUserProfileData.data.fio,
        username: getUserProfileData.data.username,
        phone: getUserProfileData.data.phone,
        role: getUserProfileData.data.role,
        more: getUserProfileData.data.more,
        doctor: getUserProfileData.data.doctor
          ? {
              experience_year: getUserProfileData.data.doctor.experience_year,
              patients_stats: getUserProfileData.data.doctor.patients_stats,
              categories: {
                name: getUserProfileData.data.doctor.categories?.name,
                services:
                  getUserProfileData.data.doctor.categories?.services?.map(
                    (s) => ({
                      name: s.name,
                      price: s.price,
                    })
                  ),
              },
            }
          : undefined,
      });
    }
  }, [getUserProfileData, form]);

  const { mutate: updateProfileMutate, isLoading: updateProfileDataLoading } =
    useMutation<UserProfileResponse, Error, UpdateProfilePayload>(
      (obj) => OneMedAdmin.updateProfileData(obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["updateProfileData"]);
          openNotificationWithIcon(
            "success",
            "Profil yangilandi",
            "Profil yangilanishi muvaffaqiyatli bo'ldi!"
          );
          handleCancel();
        },
        onError: (err) => {
          console.error("Update profile error:", err);
        },
      }
    );

  const { mutate: changePassword, isLoading: changingPassword } = useMutation<
    ChangePasswordResponse,
    unknown,
    ChangePasswordPayload
  >((payload) => OneMedAdmin.changePassword(payload), {
    onSuccess: () => {
      form.resetFields();
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

          <button
            onClick={showModal}
            className="flex gap-2 items-center hover:shadow-md transition-all duration-150  md:px-6 px-3 md:py-2 py-1.5 rounded-md text-[14px] text-white cursor-pointer bg-[#0D9488] hover:bg-[#0C8377]"
          >
            <FiPlus className="text-[20px]" />
            Accountni sozlash
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

      <Modal
        title="Admin profilini sozlash"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={false}
      >
        <Card className="!border-none">
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              const payload = {
                fio: values.fio,
                username: values.username,
                role: values.role,
                phone: values.phone,
                more: values.more,
                doctor: values.doctor
                  ? {
                      experience_year: values.doctor.experience_year,
                      services: values.doctor.services,
                    }
                  : undefined,
              };

              updateProfileMutate(payload);
            }}
          >
            <Form.Item label="FIO" name="fio">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Username" name="username">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Phone" name="phone">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Role" name="role">
              <Input disabled={true} />
            </Form.Item>

            <Form.Item label="More" name="more">
              <Input disabled={!isEditing} />
            </Form.Item>

            {getUserProfileData?.data?.doctor && (
              <>
                <Form.Item
                  label="Experience Year"
                  name={["doctor", "experience_year"]}
                >
                  <Input type="number" disabled={!isEditing} />
                </Form.Item>

                <Form.Item label="Services" name={["doctor", "services"]}>
                  <Select
                    mode="multiple"
                    placeholder="Xizmatlarni tanlang"
                    disabled={!isEditing}
                    options={[
                      {
                        label: "Service 1",
                        value: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      },
                      {
                        label: "Service 2",
                        value: "7fa85f64-5717-4562-b3fc-2c963f66afa6",
                      },
                    ]}
                  />
                </Form.Item>
              </>
            )}

            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <div
                  onClick={() => setIsEditing(true)}
                  className="flex justify-center cursor-pointer items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Tahrirlash
                </div>
              ) : (
                <Button
                  type="primary"
                  htmlType="submit"
                  className="!h-[38px] !py-2.5 !w-full"
                >
                  {updateProfileDataLoading ? (
                    <Spin
                      className="!text-white"
                      indicator={<LoadingOutlined spin />}
                    />
                  ) : (
                    "Saqlash"
                  )}
                </Button>
              )}
            </div>
          </Form>
        </Card>
      </Modal>
    </div>
  );
}
