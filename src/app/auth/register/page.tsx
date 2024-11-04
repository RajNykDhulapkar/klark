import AuthForm from "../../_components/AuthForm";
export default function Page() {
  return (
    <div className="flex items-center justify-center">
      <AuthForm defaultTab="register" />
    </div>
  );
}
