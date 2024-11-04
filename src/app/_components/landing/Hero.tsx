import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Button, buttonVariants } from "~/components/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function Hero() {
  const t = useTranslations("hero");
  return (
    <section className="container mx-auto grid place-items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
      <div className="space-y-6 text-center lg:text-start">
        <main className="text-5xl font-bold md:text-6xl">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#ae21d5] to-[#960783] bg-clip-text text-transparent">
              {t("title")}
            </span>
          </h1>{" "}
          {t("subtitle1")}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#6fbed4] via-[#63ceef] to-[#0491c1] bg-clip-text text-transparent">
              {t("subtitle2")}
            </span>
          </h2>
        </main>

        <p className="mx-auto text-xl text-muted-foreground md:w-10/12 lg:mx-0">
          {t("subtitle3")}
        </p>

        <div className="space-y-4 md:space-x-4 md:space-y-0">
          <Button className="w-full md:w-1/3" asChild>
            <Link href="auth/register">
              Get Started <ArrowRightIcon />
            </Link>
          </Button>

          <a
            rel="noreferrer noopener"
            href="https://github.com/TomDoesTech/indikit"
            target="_blank"
            className={`w-full md:w-1/3 ${buttonVariants({
              variant: "outline",
            })}`}
          >
            Github Repository
            <GitHubLogoIcon className="ml-2 h-5 w-5" />
          </a>
        </div>
      </div>

      <Image
        src="/documents.svg"
        draggable={false}
        alt="documents"
        width={420}
        height={420}
      />
    </section>
  );
}
