import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/">
      <span className="flex items-center gap-1">
        <Image src="/favicon.ico" alt="IndiKit" width={24} height={24} />
        <span className="inline bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-2xl font-bold text-transparent">
          Klark
        </span>
      </span>
    </Link>
  );
}
