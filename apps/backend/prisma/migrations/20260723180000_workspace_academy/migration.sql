-- Workspace Academy — onboarding, contextual guides, checklist, help center.
-- Educational layer only; no commercial tables touched.

CREATE TABLE "workspace_academy_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "welcome_completed_at" TIMESTAMP(3),
    "welcome_dismissed_at" TIMESTAMP(3),
    "process_overview_completed_at" TIMESTAMP(3),
    "checklist_dismissed_at" TIMESTAMP(3),
    "last_seen_academy_version" INTEGER NOT NULL DEFAULT 1,
    "last_automatic_guide_id" TEXT,
    "last_automatic_guide_at" TIMESTAMP(3),
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_academy_profiles_user_id_key" ON "workspace_academy_profiles"("user_id");

CREATE TABLE "workspace_academy_guide_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "guide_id" TEXT NOT NULL,
    "guide_version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "last_step_index" INTEGER NOT NULL DEFAULT 0,
    "display_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_guide_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_academy_guide_progress_user_id_guide_id_key" ON "workspace_academy_guide_progress"("user_id", "guide_id");
CREATE INDEX "workspace_academy_guide_progress_user_id_status_idx" ON "workspace_academy_guide_progress"("user_id", "status");

CREATE TABLE "workspace_academy_task_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "completed_at" TIMESTAMP(3),
    "completed_by_event" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_academy_task_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_academy_task_progress_user_id_task_id_key" ON "workspace_academy_task_progress"("user_id", "task_id");
CREATE INDEX "workspace_academy_task_progress_user_id_status_idx" ON "workspace_academy_task_progress"("user_id", "status");

CREATE TABLE "workspace_academy_article_views" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_id" TEXT NOT NULL,
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "view_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workspace_academy_article_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_academy_article_views_user_id_article_id_key" ON "workspace_academy_article_views"("user_id", "article_id");
CREATE INDEX "workspace_academy_article_views_user_id_last_viewed_at_idx" ON "workspace_academy_article_views"("user_id", "last_viewed_at");

ALTER TABLE "workspace_academy_profiles" ADD CONSTRAINT "workspace_academy_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_academy_guide_progress" ADD CONSTRAINT "workspace_academy_guide_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_academy_task_progress" ADD CONSTRAINT "workspace_academy_task_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_academy_article_views" ADD CONSTRAINT "workspace_academy_article_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
