import React, { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "./ui/toaster";
import { requestPasswordReset } from "../lib/auth";

const translations = {
  TR: {
    label: "HESAP KURTARMA",
    heading: ["Şifrenizi", "sıfırlayın"],
    sub: "İş e-postanızı girin, size sıfırlama bağlantısı gönderelim.",
    email: "E-POSTA", emailPh: "İş e-postanızı girin",
    submit: "Sıfırlama Bağlantısı Gönder",
    backToSignIn: "Giriş sayfasına dön",
    successTitle: "Gelen kutunuzu kontrol edin",
    successBody:
      "E-posta bir DeMaxtore hesabına aitse, yeni şifre belirlemeniz için bir bağlantı gönderdik. Bağlantı 1 saat geçerlidir.",
    devLinkHint: "E-posta gönderimi yapılandırılmadı — şifrenizi sıfırlamak için bu bağlantıyı kullanın:",
    missingEmail: "E-posta gerekli",
    missingEmailDesc: "Lütfen e-posta adresinizi girin.",
    invalidEmail: "Geçerli bir e-posta adresi girin.",
    requestFailed: "İşlem başarısız",
  },
  EN: {
    label: "ACCOUNT RECOVERY",
    heading: ["Reset your", "password"],
    sub: "Enter your work email and we will send you a reset link.",
    email: "EMAIL", emailPh: "Enter your work email",
    submit: "Send reset link",
    backToSignIn: "Back to sign in",
    successTitle: "Check your inbox",
    successBody:
      "If this email belongs to a DeMaxtore account, we sent a link to set a new password. The link is valid for 1 hour.",
    devLinkHint: "Email delivery is not configured — use this link to reset your password:",
    missingEmail: "Email required",
    missingEmailDesc: "Please enter your email address.",
    invalidEmail: "Enter a valid email address.",
    requestFailed: "Request failed",
  },
  FR: {
    label: "RÉCUPÉRATION",
    heading: ["Réinitialisez", "votre mot de passe"],
    sub: "Entrez votre e-mail professionnel et nous vous enverrons un lien.",
    email: "E-MAIL", emailPh: "Entrez votre e-mail professionnel",
    submit: "Envoyer le lien",
    backToSignIn: "Retour à la connexion",
    successTitle: "Vérifiez votre boîte mail",
    successBody:
      "Si cet e-mail correspond à un compte DeMaxtore, nous avons envoyé un lien valable 1 heure.",
    devLinkHint: "L'envoi d'e-mails n'est pas configuré — utilisez ce lien :",
    missingEmail: "E-mail requis",
    missingEmailDesc: "Veuillez saisir votre adresse e-mail.",
    invalidEmail: "Entrez une adresse e-mail valide.",
    requestFailed: "Échec de la demande",
  },
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resetPathFromUrl(resetUrl) {
  try {
    const u = new URL(resetUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return "/reset-password";
  }
}

export default function ForgotPasswordRightPanel({ lang, setLang }) {
  const t = translations[lang];
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState(null);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: t.missingEmail, description: t.missingEmailDesc });
      return;
    }
    if (!isValidEmail(email.trim())) {
      toast({ title: t.requestFailed, description: t.invalidEmail, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const data = await requestPasswordReset(email.trim());
      if (data?.resetUrl) setResetUrl(data.resetUrl);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
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
            onClick={() => setLang(l)}
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
          {sent ? (
            <div className="space-y-5">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h2 className="font-tiempos-headline text-[36px] leading-[1.05] text-slate-900">{t.successTitle}</h2>
              <p className="text-slate-500 text-[15px] leading-relaxed">{t.successBody}</p>
              {resetUrl && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                  <p className="text-xs text-amber-900">{t.devLinkHint}</p>
                  <a
                    href={resetPathFromUrl(resetUrl)}
                    className="block text-xs font-medium text-blue-700 hover:underline break-all"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}
              <a href="/login/" className="inline-block text-blue-700 text-[13px] font-semibold hover:underline">
                {t.backToSignIn}
              </a>
            </div>
          ) : (
            <>
              <div className="text-blue-700 text-[11px] font-bold tracking-[0.18em] mb-4">{t.label}</div>
              <h2 className="font-tiempos-headline text-[46px] leading-[1.02] text-slate-900">
                <span className="block whitespace-nowrap">{t.heading[0]}</span>
                <span className="block whitespace-nowrap">{t.heading[1]}</span>
              </h2>
              <p className="mt-4 text-slate-500 text-[15px]">{t.sub}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.email}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPh}
                      autoComplete="email"
                      className="input-clean w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-blue w-full h-[54px] rounded-xl text-white font-semibold text-[15px] flex items-center justify-center gap-2 relative disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? "..." : t.submit}</span>
                  <ArrowRight className="w-4 h-4 absolute right-5" />
                </button>
              </form>

              <div className="mt-6 text-center text-[13px] text-slate-500">
                <a href="/login/" className="text-blue-700 font-semibold hover:underline">{t.backToSignIn}</a>
              </div>
            </>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
