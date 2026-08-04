import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      {/* Если есть файл логотипа */}
      <Image
        src="/logo/logo.png"
        alt="Jenyawisch"
        width={40}
        height={40}
        className={`${sizes[size]} object-contain`}
        priority
      />
      <span className="font-black text-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
        Jenyawisch
      </span>
    </Link>
  );
}