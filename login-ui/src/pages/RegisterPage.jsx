import React from "react";
import LeftPanel from "../components/LeftPanel";
import RegisterRightPanel from "../components/RegisterRightPanel";
import { useLang } from "../hooks/use-lang";

export default function RegisterPage() {
  const [lang, setLang] = useLang();
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-x-hidden">
      <LeftPanel />
      <RegisterRightPanel lang={lang} setLang={setLang} />
    </div>
  );
}
