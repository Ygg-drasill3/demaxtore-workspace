// Reusable empty-state block with optional Academy deep-link / guide replay.
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";

interface Props {
  titleKey: string;
  bodyKey: string;
  articleId?: string;
  guideId?: string;
  actionLabelKey?: string;
  actionHref?: string;
  testId?: string;
}

export function EmptyStateGuide({
  titleKey,
  bodyKey,
  articleId,
  guideId,
  actionLabelKey,
  actionHref,
  testId = "academy-empty-state",
}: Props) {
  const { t } = useT();
  const { startGuide } = useWorkspaceAcademy();

  return (
    <div
      data-testid={testId}
      className="rounded-2xl border border-dashed border-paper-300 bg-paper-50/80 px-5 py-8 text-center space-y-3"
    >
      <h3 className="font-display text-base font-semibold text-ink-900">{t(titleKey)}</h3>
      <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">{t(bodyKey)}</p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {actionHref && actionLabelKey && (
          <Link to={actionHref}>
            <Button size="sm" variant="primary">{t(actionLabelKey)}</Button>
          </Link>
        )}
        {guideId && (
          <Button size="sm" variant="secondary" onClick={() => void startGuide(guideId)}>
            {t("wa.help.replayHere")}
          </Button>
        )}
        {articleId && (
          <Link
            to={`/help/articles/${articleId}`}
            className="inline-flex items-center gap-1.5 text-xs text-accent-900 hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {t("wa.process.readArticle")}
          </Link>
        )}
      </div>
    </div>
  );
}
