// apps/frontend/src/features/system/NotFoundPage.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div data-testid="not-found-page" className="max-w-md mx-auto text-center py-20 animate-fade-in">
      <div className="h-14 w-14 mx-auto rounded-full bg-paper-100 grid place-items-center text-zinc-500">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-5">Page not found</h1>
      <p className="text-sm text-zinc-500 mt-2">
        The page you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <Link to="/" className="inline-block mt-6">
        <Button>Take me home</Button>
      </Link>
    </div>
  );
}
