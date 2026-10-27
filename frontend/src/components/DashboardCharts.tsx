import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import "../App.css";
import { useQuery } from "react-query";
import { OneMedAdmin } from "../queries/query";
import { Segmented, Spin } from "antd";
import { useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";

type Props = {
  chartId: number | string;
};

const monthNames = [
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

export default function DashboardCharts({ chartId }: Props) {
  const [type, setType] = useState<"monthly" | "yearly">("monthly");
  const [type3, setType3] = useState<"monthly" | "yearly">("monthly");

  if (chartId === 1) {
    const { data: lineChartData, isLoading: lineChartLoading } = useQuery({
      queryFn: () => OneMedAdmin.lineChartData(type),
      queryKey: ["lineChartData", type], // type qo'shildi, cache to'g'ri ishlasin
      cacheTime: Infinity,
      enabled: !!type,
      staleTime: Infinity,
    });

    const dataLine =
      lineChartData?.data?.map((item: any) => {
        if (type === "yearly") {
          // yillik -> oy nomi
          return {
            name: monthNames[item.month - 1],
            soni: item.patient_count,
          };
        } else {
          // oylik -> kun
          const day = new Date(item.data).getDate();
          return {
            name: day.toString(), // faqat kun ko'rsatadi
            soni: item.patient_count,
          };
        }
      }) ?? [];

    if (lineChartLoading) {
      return (
        <div className="w-full h-[400px] flex items-center justify-center">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      );
    }

    return (
      <div>
        <div className="flex  w-full items-start justify-between">
          <h2 className="text-[20px] font-[500] mb-4">
            Jami bemorlar - {type === "monthly" ? "oylik" : "yillik"} o'sish
          </h2>
          <div className="mr-[20px]">
            <Segmented<"monthly" | "yearly">
              options={[
                { label: "Oylik", value: "monthly" },
                { label: "Yillik", value: "yearly" },
              ]}
              value={type}
              onChange={(value) => setType(value)}
            />
          </div>
        </div>
        <LineChart
          className=" !w-[100%] lineGraph"
          width={750}
          height={400}
          data={dataLine}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="5 5" />
          <Line type="monotone" dataKey="soni" stroke="blue" strokeWidth={2} />
          <XAxis dataKey="name" stroke="#8884d8" type="category" interval={0} />
          <YAxis
            width={60}
            label={{ value: "", position: "insideRight", angle: -90 }}
          />
          <Legend />
          <Tooltip />
        </LineChart>
      </div>
    );
  }

  if (chartId === 2) {
    const { data: barChartData, isLoading: barChartLoading } = useQuery({
      queryFn: () => OneMedAdmin.barChartData(),
      queryKey: ["barChartData"],
      cacheTime: Infinity,
      staleTime: Infinity,
    });

    const dataBar =
      barChartData?.data.map((item: { date: string; visit_count: number }) => {
        const day = new Date(item.date).getDate(); // '2025-09-01' → 1
        return {
          name: `${day}`,
          soni: item.visit_count,
        };
      }) ?? [];

    if (barChartLoading) {
      return (
        <div className="w-full h-[400px] flex items-center justify-center">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between w-full items-center">
          <div className="flex  w-full items-start justify-between">
            <h2 className="text-[20px] font-[500] mb-4">Oylik qabullar</h2>
          </div>
        </div>
        <BarChart width={750} height={400} data={dataBar}>
          <XAxis dataKey="name" stroke="#8884d8" type="category" interval={0} />
          <YAxis />
          <Tooltip />
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <Bar dataKey="soni" fill="#FBD35B" barSize={30} />
        </BarChart>
      </div>
    );
  }

  const getPath = (x: any, y: any, width: any, height: any) => {
    return `M${x},${y + height}
    C${x + width / 3},${y + height} ${x + width / 2},${y + height / 3} ${
      x + width / 2
    }, ${y}
    C${x + width / 2},${y + height / 3} ${x + (2 * width) / 3},${y + height} ${
      x + width
    }, ${y + height}
    Z`;
  };

  const TriangleBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    return <path d={getPath(x, y, width, height)} stroke="none" fill={fill} />;
  };

  if (chartId === 3) {
    const { data: triangleBarData, isLoading: triangleBarloading } = useQuery({
      queryFn: () => OneMedAdmin.tringleData(type3),
      queryKey: ["tringleData", type3],
      cacheTime: Infinity,
      staleTime: Infinity,
      enabled: !!type3,
    });

    const dataTringle =
      triangleBarData?.data.map((item: any) => {
        if (type3 === "yearly") {
          return {
            name: monthNames[item.month - 1],
            soni: item.monthly_revenue,
          };
        } else {
          const day = new Date(item.date).getDate();
          return {
            name: day.toString(),
            soni: item.daily_revenue,
          };
        }
      }) ?? [];

    if (triangleBarloading) {
      return (
        <div className="w-full h-[400px] flex items-center justify-center">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      );
    }

    return (
      <div>
        <div className="flex w-full items-start justify-between">
          <h2 className="text-[20px] font-[500] mb-4">
            Qabullar - {type3 === "monthly" ? "oylik" : "yillik"} daromad
          </h2>
          <div className="mr-[20px]">
            <Segmented<"monthly" | "yearly">
              options={[
                { label: "Oylik", value: "monthly" },
                { label: "Yillik", value: "yearly" },
              ]}
              value={type3}
              onChange={(value) => setType3(value)}
            />
          </div>
        </div>

        <BarChart width={750} height={400} data={dataTringle}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="soni" fill="#8884d8" shape={<TriangleBar />} />
        </BarChart>
      </div>
    );
  }
}
