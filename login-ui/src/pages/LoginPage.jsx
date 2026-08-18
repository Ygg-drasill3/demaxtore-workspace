import React from "react";
import LeftPanel from "../components/LeftPanel";
import RightPanel from "../components/RightPanel";
import { useLang } from "../hooks/use-lang";

export default function LoginPage() {
  const [lang, setLang] = useLang();
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-x-hidden">
      <LeftPanel />
      <RightPanel lang={lang} setLang={setLang} />
    </div>
  );
}
