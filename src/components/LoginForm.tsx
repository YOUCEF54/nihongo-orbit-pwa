"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";

type Mode = "login" | "signup";

function mapAuthError(msg: string): string {
  if (msg.includes("Invalid API key"))
    return "مفتاح Supabase غير صحيح — راجع NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في ملف ‎.env.local";
  if (
    msg.includes("Database error saving new user") ||
    msg.includes("Database error creating new user")
  )
    return "خطأ في قاعدة البيانات أثناء إنشاء الحساب — تأكّد من تشغيل ملف الترحيل 0001_schema.sql في Supabase";
  if (msg.includes("Invalid login credentials"))
    return "بيانات الدخول غير صحيحة.";
  if (msg.includes("Email not confirmed"))
    return "لم يتم تأكيد بريدك الإلكتروني بعد — فعّل الحساب من الرسالة التي أرسلناها.";
  if (msg.includes("at least 6")) return "كلمة المرور يجب ألا تقل عن 6 أحرف.";
  if (msg.includes("already registered") || msg.includes("already exists"))
    return "هذا البريد مسجّل بالفعل — سجّل الدخول.";
  if (msg.toLowerCase().includes("signups not allowed"))
    return "التسجيل بالبريد الإلكتروني معطّل في إعدادات المصادقة (Authentication → Providers).";
  if (msg.includes("valid email")) return "أدخل بريدًا إلكترونيًا صحيحًا.";
  return `تعذّر إكمال الطلب — ${msg}`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.86c2.26-2.09 3.56-5.17 3.56-8.89z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.86-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.13A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.55.38-2.27V6.6H1.29a11.99 11.99 0 0 0 0 10.8l3.98-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.6l3.98 3.13C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) setError(mapAuthError(err.message));
    } catch {
      setError("تعذّر بدء تسجيل الدخول عبر Google.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) setError(mapAuthError(err.message));
        else {
          router.push("/");
          router.refresh();
        }
      } else {
        const options = displayName.trim()
          ? { data: { display_name: displayName.trim() } }
          : {};
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options,
        });
        if (err) setError(mapAuthError(err.message));
        else if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfo(
            "أرسلنا رسالة تأكيد إلى بريدك الإلكتروني — فعّل حسابك ثم سجّل الدخول.",
          );
        }
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? mapAuthError(e.message)
          : "حدث خطأ غير متوقع، حاول مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-line bg-abyss px-4 py-3 text-sm text-cream placeholder:text-faint outline-none transition-colors focus:border-cyan";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-extrabold">تعلّم اليابانية</h1>
        <p className="text-xs text-muted">
          مرافقك اليومي لإتقان اليابانية بالعربية
        </p>
      </div>

      <div className="w-full rounded-3xl border border-line bg-abyss p-6">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-void/50 p-1 text-sm font-bold" role="group" aria-label="وضع الدخول">
          <button
            type="button"
            onClick={() => switchMode("login")}
            aria-pressed={mode === "login"}
            className={`rounded-lg py-2 transition-colors ${
              mode === "login" ? "bg-cyan text-void" : "text-muted"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            aria-pressed={mode === "signup"}
            className={`rounded-lg py-2 transition-colors ${
              mode === "signup" ? "bg-cyan text-void" : "text-muted"
            }`}
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="الاسم الظاهر (اختياري)"
              aria-label="الاسم الظاهر (اختياري)"
              className={inputClass}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            aria-label="البريد الإلكتروني"
            className={inputClass}
            dir="ltr"
            style={{ textAlign: "left" }}
            autoComplete="email"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            aria-label="كلمة المرور (6 أحرف على الأقل)"
            className={inputClass}
            dir="ltr"
            style={{ textAlign: "left" }}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />

          {error && (
            <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-xs leading-relaxed text-crimson">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="rounded-xl bg-cyan/10 px-4 py-3 text-xs leading-relaxed text-cyan">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-1 py-3.5"
          >
            {loading
              ? "جارٍ المعالجة…"
              : mode === "login"
                ? "تسجيل الدخول"
                : "إنشاء الحساب"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] text-muted">
          <span className="h-px flex-1 bg-line" />
          أو
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-void py-3 font-bold text-cream transition-colors hover:border-cyan/50"
        >
          <GoogleIcon />
          المتابعة باستخدام Google
        </button>
      </div>

      <p className="text-xs text-muted">
        <a
          href="https://instagram.com/learnjapanese.words"
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="tracking-wide hover:text-cyan"
        >
          @learnjapanese.words
        </a>
      </p>
    </div>
  );
}
