/// <reference types="vite/client" />

declare const __DMX_BUILD_INFO__: {
  commitSha: string;
  branch: string;
  buildTime: string;
};

interface Window {
  __DMX_BUILD_INFO__: typeof __DMX_BUILD_INFO__;
}
