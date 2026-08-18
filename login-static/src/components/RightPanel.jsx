import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "./ui/toaster";
import { loginWithCredentials, isGoogleSignInEnabled, startGoogleSignIn, postLoginPath } from "../lib/auth";

/** TEMP — empty pilot demo accounts (Customer #1 user test). */
const PILOT_DEMO_PASSWORD = "Passw0rd!";
const PILOT_DEMO_ACCOUNTS = [
  { email: "buyer.utest@demaxtore.local", label: "Türk İthalatçı" },
  { email: "buyer.v2.utest@demaxtore.local", label: "Türk İthalatçı v2" },
  { email: "supplier.utest@demaxtore.local", label: "Türk Tedarikçi" },
  { email: "supplier.foreign.utest@demaxtore.local", label: "Yurt Dışı Tedarikçi" },
  { email: "broker.utest@demaxtore.local", label: "Gümrük" },
  { email: "trucker.utest@demaxtore.local", label: "Nakliyeci" },
  { email: "origin.utest@demaxtore.local", label: "Origin" },
];

const translations = {
  TR: {
    label: "GİRİŞ YAP",
    heading: ["Tekrar hoş", "geldiniz"],
    sub: "DeMaxtore çalışma alanınıza giriş yapın",
    access: "Tedarik ve ithalat çalışma alanınıza erişin.",
    email: "E-POSTA", emailPh: "E-posta adresinizi girin",
    password: "ŞİFRE", passwordPh: "Şifrenizi girin",
    forgot: "Şifremi Unuttum", submit: "Giriş Yap", or: "veya",
    google: "Google ile Giriş Yap",
    noAccount: "Hesabınız yok mu?", createAccount: "Hesap Oluşturun",
    missingFields: "Eksik alanlar", missingFieldsDesc: "Lütfen e-posta ve şifrenizi girin.",
    passwordTooShort: "Şifre çok kısa", passwordTooShortDesc: "Şifreniz en az 8 karakter olmalıdır.",
    loginFailed: "Giriş başarısız",
    googleUnavailable: "Google girişi kullanılamıyor",
    googleUnavailableDesc: "Google OAuth henüz yapılandırılmamış. E-posta ile giriş yapın.",
    googleCancelled: "Google girişi iptal edildi",
    googleFailed: "Google ile giriş başarısız oldu",
  },
  EN: {
    label: "SIGN IN",
    heading: ["Welcome", "back"],
    sub: "Sign in to your DeMaxtore workspace",
    access: "Access your sourcing and import workspace.",
    email: "EMAIL", emailPh: "Enter your email address",
    password: "PASSWORD", passwordPh: "Enter your password",
    forgot: "Forgot password", submit: "Sign in", or: "or",
    google: "Sign in with Google",
    noAccount: "Don't have an account?", createAccount: "Create account",
    missingFields: "Missing fields", missingFieldsDesc: "Please enter both email and password.",
    passwordTooShort: "Password too short", passwordTooShortDesc: "Password must be at least 8 characters.",
    loginFailed: "Sign in failed",
    googleUnavailable: "Google sign-in unavailable",
    googleUnavailableDesc: "Google OAuth is not configured yet. Please sign in with email.",
    googleCancelled: "Google sign-in was cancelled",
    googleFailed: "Google sign-in failed",
  },
  FR: {
    label: "CONNEXION",
    heading: ["Bon retour", "parmi nous"],
    sub: "Connectez-vous à votre espace DeMaxtore",
    access: "Accédez à votre espace d'approvisionnement et d'importation.",
    email: "E-MAIL", emailPh: "Entrez votre adresse e-mail",
    password: "MOT DE PASSE", passwordPh: "Entrez votre mot de passe",
    forgot: "Mot de passe oublié", submit: "Se connecter", or: "ou",
    google: "Se connecter avec Google",
    noAccount: "Pas de compte ?", createAccount: "Créer un compte",
    missingFields: "Champs manquants", missingFieldsDesc: "Veuillez saisir votre e-mail et votre mot de passe.",
    passwordTooShort: "Mot de passe trop court", passwordTooShortDesc: "Le mot de passe doit contenir au moins 8 caractères.",
    loginFailed: "Échec de la connexion",
    googleUnavailable: "Connexion Google indisponible",
    googleUnavailableDesc: "Google OAuth n'est pas configuré. Connectez-vous par e-mail.",
    googleCancelled: "Connexion Google annulée",
    googleFailed: "Échec de la connexion Google",
  },
};

const APP_LOCALE_STORAGE_KEY = "demax_locale";
const LANG_TO_LOCALE = { TR: "tr", EN: "en", FR: "fr" };

function persistAppLocale(lang) {
  try {
    const locale = LANG_TO_LOCALE[lang] ?? "en";
    // Frontend i18n store supports legacy plain locale value.
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.)
  }
}

export default function RightPanel({ lang, setLang }) {
  const t = translations[lang];
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [demoBusy, setDemoBusy] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error) return;

    const messages = {
      google_not_configured: { title: t.googleUnavailable, description: t.googleUnavailableDesc },
      google_auth_cancelled: { title: t.googleCancelled, description: t.googleUnavailableDesc },
      google_auth_failed: { title: t.googleFailed, description: t.googleUnavailableDesc },
    };
    const msg = messages[error] ?? { title: t.loginFailed, description: t.missingFieldsDesc };
    toast({ ...msg, variant: "destructive" });
    window.history.replaceState({}, "", window.location.pathname);
  }, [t, toast]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      persistAppLocale(lang);
      const enabled = await isGoogleSignInEnabled();
      if (!enabled) {
        toast({
          title: t.googleUnavailable,
          description: t.googleUnavailableDesc,
          variant: "destructive",
        });
        return;
      }
      startGoogleSignIn();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const emailValue = String(fd.get("email") ?? email).trim();
    const passwordValue = String(fd.get("password") ?? password);

    if (!emailValue || !passwordValue) {
      toast({ title: t.missingFields, description: t.missingFieldsDesc, variant: "destructive" });
      return;
    }
    if (passwordValue.length < 8) {
      toast({ title: t.passwordTooShort, description: t.passwordTooShortDesc, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setLoginError("");
    try {
      persistAppLocale(lang);
      const user = await loginWithCredentials(emailValue, passwordValue);
      window.location.assign(postLoginPath(user.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.missingFieldsDesc;
      setLoginError(msg);
      toast({
        title: t.loginFailed,
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setDemoBusy(demoEmail);
    setLoginError("");
    try {
      persistAppLocale(lang);
      const user = await loginWithCredentials(demoEmail, PILOT_DEMO_PASSWORD);
      window.location.assign(postLoginPath(user.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.missingFieldsDesc;
      setLoginError(msg);
      toast({ title: t.loginFailed, description: msg, variant: "destructive" });
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <div className="relative w-full lg:w-[42%] bg-white overflow-hidden">
      <div className="absolute inset-0 bg-grid-light opacity-70 pointer-events-none" />
      <div className="absolute top-24 right-8 w-[380px] h-[260px] world-dots opacity-30 pointer-events-none" />

      <div className="absolute top-8 right-8 z-20 lang-switch flex items-center gap-1">
        {["TR", "EN", "FR"].map((l) => (
          <button
            key={l}
            onClick={() => {
              persistAppLocale(l);
              setLang(l);
            }}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
              lang === l ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="relative z-10 min-h-full flex items-start px-8 lg:px-20 pt-16 lg:pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="text-blue-700 text-[11px] font-bold tracking-[0.18em] mb-4">{t.label}</div>
          <h2 className="font-tiempos-headline text-[46px] leading-[1.02] text-slate-900">
            <span className="block whitespace-nowrap">{t.heading[0]}</span>
            <span className="block whitespace-nowrap">{t.heading[1]}</span>
          </h2>
          <p className="mt-4 text-slate-500 text-[15px]">{t.sub}</p>

          <div className="mt-5 flex items-center gap-2 text-slate-500 text-[13px]">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>{t.access}</span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {loginError ? (
              <p data-testid="login-error" className="text-sm text-red-600" role="alert">{loginError}</p>
            ) : null}
            <div>
              <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.email}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  data-testid="login-email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  className="input-clean w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  data-testid="login-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPh}
                  className="input-clean w-full h-[52px] pl-11 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <a href="/forgot-password" className="text-blue-700 text-[13px] font-medium hover:underline">{t.forgot}</a>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={submitting}
              className="btn-primary-blue w-full h-[54px] rounded-xl text-white font-semibold text-[15px] flex items-center justify-center gap-2 relative disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              <span>{submitting ? "..." : t.submit}</span>
              <ArrowRight className="w-4 h-4 absolute right-5" />
            </button>
          </form>

          <div data-testid="pilot-demo-shortcuts" className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Demo hesaplar (geçici)
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex flex-wrap gap-2">
              {PILOT_DEMO_ACCOUNTS.map(({ email, label }) => (
                <button
                  key={email}
                  type="button"
                  data-testid={`pilot-demo-${email.split("@")[0]}`}
                  disabled={submitting || !!demoBusy}
                  onClick={() => handleDemoLogin(email)}
                  title={email}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[12px] font-medium hover:bg-slate-100 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  {demoBusy === email ? "..." : label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Boş hesap · şifre Passw0rd!
            </p>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-[12px]">{t.or}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-[52px] rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-[14px] flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            {googleLoading ? "..." : t.google}
          </button>

          <div className="mt-6 text-center text-[13px] text-slate-500">
            {t.noAccount}{" "}
            <a href="/register" className="text-blue-700 font-semibold hover:underline">{t.createAccount}</a>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.2 0-9.7-3.3-11.3-8L6.1 33C9.4 39.4 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C41 34.9 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
