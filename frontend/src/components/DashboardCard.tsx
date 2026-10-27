import { ReactNode } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { IoMdTrendingUp, IoMdTrendingDown } from "react-icons/io";

export type SparkPoint = { value: number };

type Props = {
  variant?: "dark" | "light";
  title: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  changeLabel?: string;
  changeDirection?: "up" | "down";
  subtitle: string;
  sparkData?: SparkPoint[];
  sparkColor?: string;
  onClick?: () => void;
};

export default function DashboardCard({
  variant = "light",
  title,
  icon,
  iconBg,
  iconColor,
  value,
  changeLabel,
  changeDirection = "up",
  subtitle,
  sparkData,
  sparkColor = "#0D9488",
  onClick,
}: Props) {
  const isDark = variant === "dark";

  return (
    <div
      onClick={onClick}
      className={`w-full h-full rounded-[14px] px-5 py-4 flex flex-col justify-between ${
        onClick ? "cursor-pointer" : ""
      } ${
        isDark
          ? "bg-[#0F2A2A] text-white"
          : "bg-white border border-[#ECEFF1] text-[#1A1A1A]"
      }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-[13px] font-[500] ${
            isDark ? "text-white/70" : "text-[#64727B]"
          }`}
        >
          {title}
        </p>
        <div
          className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[16px] ${
            isDark ? "bg-white/10 text-[#2DD4BF]" : `${iconBg} ${iconColor}`
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2">
        <span className="text-[24px] font-[700]">{value}</span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {changeLabel && (
            <span
              className={`flex items-center gap-1 text-[11px] font-[600] px-1.5 py-0.5 rounded-[6px] ${
                changeDirection === "up"
                  ? isDark
                    ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                    : "bg-[#E9FBF4] text-[#0D9488]"
                  : "bg-[#FDEDED] text-[#E24C4C]"
              }`}
            >
              {changeDirection === "up" ? <IoMdTrendingUp /> : <IoMdTrendingDown />}
              {changeLabel}
            </span>
          )}
          <span
            className={`text-[11px] ${
              isDark ? "text-white/50" : "text-[#8F99A3]"
            }`}
          >
            {subtitle}
          </span>
        </div>
      </div>

      {sparkData && sparkData.length > 1 && (
        <div className="h-[36px] -mx-1 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isDark ? "#2DD4BF" : sparkColor}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? "#2DD4BF" : sparkColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isDark ? "#2DD4BF" : sparkColor}
                strokeWidth={2}
                fill={`url(#spark-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
