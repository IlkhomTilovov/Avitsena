import { Form, Input, notification, Spin } from "antd";
import Container from "../components/Container";
import { useMutation, useQueryClient } from "react-query";
import { AvitcenaAdmin } from "../queries/query";
import { useNavigate } from "react-router-dom";
import { LoadingOutlined } from "@ant-design/icons";
import { RuleObject } from "antd/es/form";
import { StoreValue } from "antd/es/form/interface";
import { useCreateContext } from "../context/ContextApi";
import logo from "../../public/images/logo.svg";

export default function Login() {
  const navigate = useNavigate();
  const { setUserFio, setUserData } = useCreateContext();
  type AuthPayload = {
    phone: string;
    password: string;
  };
  type AuthResponse = {
    data: { role: string; fio: string; username: string; phone: string };
  };

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

  const { mutate: loginMutate, isLoading: loginLoading } = useMutation<
    AuthResponse,
    Error,
    AuthPayload
  >((obj) => AvitcenaAdmin.authLogin(obj), {
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      console.log("Access olindi Loginniki. Data:", data);
      if (data?.data.role === "admin") {
        navigate("/dashboard");
      } else if (data?.data.role === "doctor") {
        navigate("/doctor/patients");
      } else if (data?.data.role === "registrator") {
        navigate("/register/registration");
      } else if (data?.data.role === "superadmin") {
        navigate("/superadmin/clinics");
      } else {
        navigate("/");
      }

      setUserFio(data.data.fio);
      setUserData({
        fio: data.data.fio,
        username: data.data.username,
        phone: data.data.phone,
      });
    },
    onError: (error) => {
      openNotificationWithIcon("error", "Xatolik yuz berdi!", error?.message);
    },
  });

  const authTakeValue = (value: AuthPayload) => {
    loginMutate(value);
  };

  return (
    <div className="bg-[#ececec]">
      {contextHolder}
      <Container className="flex justify-center items-center min-h-screen ">
        <div className="border border-[#D9D9D9] flex flex-col items-center gap-10 md:w-md w-full px-3 md:p-10 rounded-md bg-white py-[20px] md:py-auto">
          <div className=" flex flex-col items-center">
            <div className="bg-blue-200 p-4 rounded-full">
              <img loading="lazy" src={logo} alt="" className="w-[35px]" />
            </div>
            <div className="flex flex-col items-center mt-4">
              <h1 className="text-[24px] font-semibold">Tizimga kirish</h1>
              <p>Telefon raqamingiz va parolingizni kiriting!</p>
            </div>
          </div>
          <Form
            onFinish={authTakeValue}
            layout="vertical"
            className="inline-block  w-full "
          >
            <Form.Item
              name="login"
              label="Username yoki Telefon raqam"
              rules={[
                {
                  required: true,
                  message: "Username yoki Telefon raqam kiriting",
                },
              ]}
            >
              <Input
                placeholder="Foydalanuvchi ismi yoki tel raqami"
                className="w-full px-2 outline-none border-[0.5px] border-[#D9D9D9] !py-2 !rounded-[4px] hover:border-[#1677ff] focus:border-[#1677ff] focus:shadow-[0_0_0_2px_rgba(5,145,255,0.1)] transition"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Pasword"
              rules={[
                { required: true, message: "Parolni kiriting!" },
                {
                  validator: (_: RuleObject, value: StoreValue) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    const hasUpperCase = /[A-Z]/.test(value as string);
                    if (!hasUpperCase) {
                      return Promise.reject(
                        new Error(
                          "Parolda hech bo‘lmasa bitta katta harf bo‘lishi kerak!"
                        )
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.Password
                type="password"
                className="!py-2 !rounded-[4px]"
              />
            </Form.Item>
            <button
              className="w-full !rounded-[4px]  !h-[39px] !bg-[#2B7FFF] !text-[#fff] flex justify-center items-center cursor-pointer"
              // to="/dashboard"
            >
              {loginLoading ? (
                <div>
                  <Spin
                    indicator={<LoadingOutlined spin />}
                    className="!text-white"
                  />
                </div>
              ) : (
                "Kirish"
              )}
            </button>
          </Form>
        </div>
      </Container>
    </div>
  );
}
