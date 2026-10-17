import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "تسجيل الدخول | تعلّم اليابانية",
};

export default function LoginPage() {
  return (
    <div className="relative">
      <div className="absolute start-4 top-4 z-10">
        <ThemeToggle compact />
      </div>
      <LoginForm />
    </div>
  );
}