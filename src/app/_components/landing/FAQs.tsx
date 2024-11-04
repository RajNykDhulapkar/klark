import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { LargeHeading } from "../Text";
import { useTranslations } from "next-intl";

const faqs = [
  {
    question: "Is this kit free?",
    answer: "Yes. Use it as you please",
    value: "item-1",
  },
  {
    question: "Can I use this in a commercial project?",
    answer: "Yes. Use it as you please",
    value: "item-2",
  },
  {
    question: "I love it! Can I donate to the creator?",
    answer: "Yes. you can buy me a coffee at https://buymeacoffee.com/tomn",
    value: "item-3",
  },
] as const;

export function FAQ() {
  const t = useTranslations("faq");
  return (
    <section id="faq" className="container mx-auto py-24 sm:py-32">
      <LargeHeading>{t("title")}</LargeHeading>

      <Accordion type="single" collapsible className="AccordionRoot w-full">
        {faqs.map(({ question, answer, value }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left">
              {question}
            </AccordionTrigger>

            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <h3 className="mt-4 font-medium">
        {t("subtitle")}
        <a
          rel="noreferrer noopener"
          href="#"
          className="border-primary text-primary transition-all hover:border-b-2"
        >
          {t("contact")}
        </a>
      </h3>
    </section>
  );
}
