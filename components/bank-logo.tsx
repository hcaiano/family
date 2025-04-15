import Image from "next/image";

type BankLogoProps = {
  bankType: string;
  className?: string;
};

export function BankLogo({ bankType, className }: BankLogoProps) {
  const logos: Record<string, string> = {
    bpi: "/banks/bpi.png",
    revolut: "/banks/revolut.png",
  };

  const defaultLogo = "/banks/default.png";
  const logoSrc = logos[bankType] || defaultLogo;

  return (
    <div className={`relative w-12 h-12 ${className || ""}`}>
      <Image
        src={logoSrc}
        alt={`${bankType} logo`}
        fill
        className="object-contain rounded-lg"
      />
    </div>
  );
}
