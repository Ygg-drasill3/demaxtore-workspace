import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "./ui/toaster";
import { registerAccount, postLoginPath } from "../lib/auth";

const translations = {
  TR: {
    label: "KAYIT OL",
    heading: ["Hesabınızı", "oluşturun"],
    sub: "Alıcı firmanızı kaydederek DeMaxtore'a başlayın",
    name: "YETKİLİ ADI", namePh: "Adınızı girin",
    company: "FİRMA ADI", companyPh: "Firma adınızı girin",
    email: "E-POSTA", emailPh: "İş e-postanızı girin",
    phone: "TELEFON", phonePh: "+905551234567",
    password: "ŞİFRE", passwordPh: "En az 8 karakter",
    submit: "Hesap Oluştur",
    hasAccount: "Zaten hesabınız var mı?", signIn: "Giriş yapın",
    missingFields: "Eksik alanlar",
    missingFieldsDesc: "Lütfen tüm alanları doldurun.",
    registerFailed: "Kayıt başarısız",
    passwordShort: "Şifre en az 8 karakter olmalı.",
    invalidEmail: "Geçerli bir e-posta adresi girin.",
  },
  EN: {
    label: "REGISTER",
    heading: ["Create your", "account"],
    sub: "Register your company as a buyer on DeMaxtore",
    name: "CONTACT NAME", namePh: "Enter your name",
    company: "COMPANY NAME", companyPh: "Enter your company name",
    email: "EMAIL", emailPh: "Enter your work email",
    phone: "PHONE", phonePh: "+905551234567",
    password: "PASSWORD", passwordPh: "At least 8 characters",
    submit: "Create account",
    hasAccount: "Already have an account?", signIn: "Sign in",
    missingFields: "Missing fields",
    missingFieldsDesc: "Please fill in all fields.",
    registerFailed: "Registration failed",
    passwordShort: "Password must be at least 8 characters.",
    invalidEmail: "Enter a valid email address.",
  },
  FR: {
    label: "INSCRIPTION",
    heading: ["Créez votre", "compte"],
    sub: "Inscrivez votre entreprise acheteur sur DeMaxtore",
    name: "NOM DU CONTACT", namePh: "Entrez votre nom",
    company: "NOM DE L'ENTREPRISE", companyPh: "Entrez le nom de l'entreprise",
    email: "E-MAIL", emailPh: "Entrez votre e-mail professionnel",
    phone: "TÉLÉPHONE", phonePh: "+33612345678",
    password: "MOT DE PASSE", passwordPh: "Au moins 8 caractères",
    submit: "Créer un compte",
    hasAccount: "Vous avez déjà un compte ?", signIn: "Se connecter",
    missingFields: "Champs manquants",
    missingFieldsDesc: "Veuillez remplir tous les champs.",
    registerFailed: "Échec de l'inscription",
    passwordShort: "Le mot de passe doit contenir au moins 8 caractères.",
    invalidEmail: "Entrez une adresse e-mail valide.",
  },
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RegisterRightPanel({ lang, setLang }) {
  const t = translations[lang];
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !organisationName.trim() || !email.trim() || !password || !phone.trim()) {
      toast({ title: t.missingFields, description: t.missingFieldsDesc });
      return;
    }
    if (!isValidEmail(email.trim())) {
      toast({ title: t.registerFailed, description: t.invalidEmail, variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: t.registerFailed, description: t.passwordShort, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const user = await registerAccount({
        displayName: displayName.trim(),
        organisationName: organisationName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });
      window.location.assign(postLoginPath(user.role));
    } catch (err) {
      toast({
        title: t.registerFailed,
        description: err instanceof Error ? err.message : t.missingFieldsDesc,
        variant: "destructive",
      });
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
          <div className="text-blue-700 text-[11px] font-bold tracking-[0.18em] mb-4">{t.label}</div>
          <h2 className="font-tiempos-headline text-[46px] leading-[1.02] text-slate-900">
            <span className="block whitespace-nowrap">{t.heading[0]}</span>
            <span className="block whitespace-nowrap">{t.heading[1]}</span>
          </h2>
          <p className="mt-4 text-slate-500 text-[15px]">{t.sub}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.name}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t.namePh}
                    autoComplete="name"
                    className="input-clean w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.company}</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    placeholder={t.companyPh}
                    autoComplete="organization"
                    className="input-clean w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
                  />
                </div>
              </div>
            </div>

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

            <div>
              <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePh}
                autoComplete="tel"
                data-testid="register-phone"
                className="input-clean w-full h-[52px] px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-[14px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.14em] text-slate-500 mb-2">{t.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPh}
                  autoComplete="new-password"
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

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-blue w-full h-[54px] rounded-xl text-white font-semibold text-[15px] flex items-center justify-center gap-2 relative disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <span>{submitting ? "..." : t.submit}</span>
              <ArrowRight className="w-4 h-4 absolute right-5" />
            </button>
          </form>

          <div className="mt-6 text-center text-[13px] text-slate-500">
            {t.hasAccount}{" "}
            <a href="/login/" className="text-blue-700 font-semibold hover:underline">{t.signIn}</a>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
