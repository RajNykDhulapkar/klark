import AuthForm from "../../_components/AuthForm";

export default function Component() {
  return (
    <div className="flex items-center justify-center">
      <AuthForm defaultTab="login" />
    </div>
  );
}
