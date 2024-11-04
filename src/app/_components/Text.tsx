export function LargeHeading({ children }: { children: string }) {
  return (
    <h2 className="mb-6 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      {children}
    </h2>
  );
}
