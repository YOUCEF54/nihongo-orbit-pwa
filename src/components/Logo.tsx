import Image from "next/image";

interface LogoProps {
  /** Rendered height in px; width scales with the image aspect ratio. */
  size?: number;
  className?: string;
}

export default function Logo({ size = 38, className = "" }: LogoProps) {
  return (
    <Image
      src="/Logo.png"
      alt="تعلّم اليابانية"
      width={size * 1.5}
      height={size}
      priority
      className={className}
      style={{ height: size, width: "auto" }}
    />
  );
}
