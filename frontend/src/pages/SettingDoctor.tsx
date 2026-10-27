import SecureStorage from "react-secure-storage";
import { useCreateContext } from "../context/ContextApi";
import { Button, Form, Input, message, Spin } from "antd";
import { useEffect, useState } from "react";
import { useMutation } from "react-query";
import {
  ChangePasswordPayload,
  ChangePasswordResponse,
  OneMedAdmin,
  UpdateUserProfilePayloadUpdate,
} from "../queries/query";
import { LoadingOutlined } from "@ant-design/icons";

export default function SettingDoctor() {
  const { getUserProfileData } = useCreateContext();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [showPass, setShowPass] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const saved = SecureStorage.getItem("userSettingData");

    let parsed: { fio: string; phone: string; username: string } | null = null;

    if (typeof saved === "string") {
      parsed = JSON.parse(saved);
    }

    const finalData =
      getUserProfileData?.data.fio &&
      getUserProfileData?.data.username &&
      getUserProfileData?.data.phone
        ? getUserProfileData?.data
        : parsed;

    if (finalData) {
      form.setFieldsValue({
        fio: finalData.fio,
        username: finalData.username,
        phone: finalData.phone,
      });
    }
  }, [getUserProfileData, form]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Saqlash bosilganda formni submit qilamiz
      form.submit();
    }
    setIsEditing(!isEditing);
  };

  const { mutate: updateProfile } = useMutation(
    (payload: UpdateUserProfilePayloadUpdate) =>
      OneMedAdmin.updateUserProfile(payload),
    {
      onSuccess: (res) => {
        console.log("Profil yangilandi ✅", res);
      },
    }
  );

  const handleSave = (values: any) => {
    // bu yerda update mutation chaqiriladi
    setIsEditing(false);
    updateProfile(values);
  };

  const { mutate: changePassword, isLoading: changingPassword } = useMutation<
    ChangePasswordResponse,
    unknown,
    ChangePasswordPayload
  >((payload) => OneMedAdmin.changePassword(payload), {
    onSuccess: (res) => {
      message.success(res.message || "Parol muvaffaqiyatli o‘zgartirildi ✅");
      passwordForm.resetFields();
      setShowPass(false);
    },
    onError: () => {
      message.error("Parolni o‘zgartirishda xatolik ❌");
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
      <div className="mt-4 mb-2">
        <h2 className="md:text-[20px] text-[16px] font-[500]">
          Foydalanuvchi shaxsiy kabinetini sozlash
        </h2>
      </div>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <div>
          <h3 className="md:text-[16px] text-[14px] font-[500]">
            Umumiy ma’lumotlar va ularni o‘zgartirish
          </h3>
        </div>
        <div className="grid grid-cols-12 gap-x-4">
          <Form.Item
            name="fio"
            label="FIO"
            className="md:col-span-6 col-span-12"
          >
            <Input disabled={!isEditing} />
          </Form.Item>
          <Form.Item
            name="username"
            label="Username"
            className="md:col-span-6 col-span-12"
          >
            <Input disabled={!isEditing} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Tel raqami"
            className="md:col-span-6 col-span-12"
          >
            <Input disabled={!isEditing} />
          </Form.Item>
        </div>
        <div className="flex md:gap-3 justify-end">
          <Form.Item>
            <Button
              type="primary"
              className="md:!px-6 !h-[38px] !text-[12px] md:!text-[16px]"
              onClick={handleEditToggle}
            >
              {isEditing ? "Saqlash" : "Ma’lumotlarni o‘zgartirish"}
            </Button>
          </Form.Item>
          {!showPass && (
            <Button
              onClick={() => setShowPass(true)}
              htmlType="button"
              className="md:!px-6 !text-[12px] md:!text-[16px] !h-[38px]"
            >
              Parolni o‘zgartirish
            </Button>
          )}
        </div>
      </Form>

      {showPass && (
        <Form
          layout="vertical"
          form={passwordForm}
          onFinish={handlePasswordSave}
        >
          <div>
            <h3 className="text-[16px] font-[500]">Parolni o‘zgartirish</h3>
          </div>
          <div className="grid grid-cols-12 gap-x-4">
            <Form.Item
              name="oldPassword"
              label="Eski parolingizni kiriting"
              className="md:col-span-6 col-span-12"
              rules={[{ required: true, message: "Eski parolni kiriting!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Yangi parolni kiriting"
              className="md:col-span-6 col-span-12"
              rules={[{ required: true, message: "Yangi parolni kiriting!" }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="reNewPassword"
              label="Parolni takrorlang"
              className="md:col-span-6 col-span-12"
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
          </div>
          <div className="flex justify-end">
            <Form.Item>
              <Button
                htmlType="submit"
                type="primary"
                className="md:!px-6 !text-[12px] md:!text-[16px] !h-[38px]"
              >
                {changingPassword ? (
                  <Spin
                    className="!text-white"
                    indicator={<LoadingOutlined spin />}
                  />
                ) : (
                  "Parolni o‘zgartirish"
                )}
              </Button>
            </Form.Item>
          </div>
        </Form>
      )}
    </div>
  );
}
