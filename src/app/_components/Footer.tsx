import Link from "next/link";
import { Logo } from "./Logo";
import {
  PiCoffee,
  PiDiscordLogo,
  PiGithubLogo,
  PiXLogo,
  PiYoutubeLogo,
} from "react-icons/pi";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer id="footer">
      <hr className="mx-auto w-11/12" />

      <section className="container mx-auto grid grid-cols-2 gap-x-12 gap-y-8 py-20 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-full xl:col-span-2">
          <Logo />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">{t("follow")}</h3>
          <div>
            <a
              rel="noreferrer noopener"
              href="https://github.com/RajNykDhulapkar"
              className="flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <PiGithubLogo />
              Github
            </a>
          </div>

          <div>
            <a
              rel="noreferrer noopener"
              href="https://x.com/RajNykDhulapkar"
              className="flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <PiXLogo />X
            </a>
          </div>

          <div>
            <a
              rel="noreferrer noopener"
              href="https://www.youtube.com/rajnykdhulapkar"
              className="flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <PiYoutubeLogo />
              YouTube
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">{t("support")}</h3>
          <div>
            <a
              rel="noreferrer noopener"
              href="https://discord.gg/4ae2Esm6P7"
              className="flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <PiDiscordLogo />
              Discord
            </a>
          </div>
          <div>
            <a
              rel="noreferrer noopener"
              href="https://buymeacoffee.com/tomn"
              className="flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <PiCoffee />
              Buy me a coffee
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">{t("about")}</h3>
          <div>
            <Link href="/pricing" className="opacity-60 hover:opacity-100">
              Pricing
            </Link>
          </div>
        </div>
      </section>
    </footer>
  );
}
