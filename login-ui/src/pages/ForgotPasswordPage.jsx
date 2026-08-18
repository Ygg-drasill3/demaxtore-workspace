import React from "react";
import LeftPanel from "../components/LeftPanel";
import ForgotPasswordRightPanel from "../components/ForgotPasswordRightPanel";
import { useLang } from "../hooks/use-lang";

export default function ForgotPasswordPage() {
  const [lang, setLang] = useLang();
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-x-hidden">
      <LeftPanel />
      <ForgotPasswordRightPanel lang={lang} setLang={setLang} />
    </div>
  );
}
