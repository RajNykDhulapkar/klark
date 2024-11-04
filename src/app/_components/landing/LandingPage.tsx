import { Pricing } from "../Pricing";
import { FAQ } from "./FAQs";
import { Hero } from "./Hero";

export function LandingPage() {
  return (
    <>
      <Hero />
      <hr />
      <FAQ />
      <hr />
      <Pricing />
    </>
  );
}
