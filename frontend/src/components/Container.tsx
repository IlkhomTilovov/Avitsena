import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};
export default function Container({ children, className = "" }: Props) {
  return (
    <div
      className={`md:w-[80%] lg:w-[80%] mx-auto w-full px-2 md:px-auto ${className}`}
    >
      {children}
    </div>
  );
}
