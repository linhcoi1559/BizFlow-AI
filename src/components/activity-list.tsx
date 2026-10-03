import {
  Building2,
  BellRing,
  CircleDot,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FileStack,
  FolderKanban,
  ListChecks,
  Settings2,
  WandSparkles,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";

type ActivityItem = {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
};

const iconByType = {
  client_created: Building2,
  client_updated: Building2,
  project_created: FolderKanban,
  project_updated: FolderKanban,
  company_profile_updated: Settings2,
  ai_workflow_created: WandSparkles,
  template_created: FileStack,
  template_version_created: FileStack,
  document_created: FileStack,
  document_updated: FileStack,
  document_submitted: FileStack,
  document_approved: FileCheck2,
  plan_created: ClipboardCheck,
  plan_updated: ClipboardCheck,
  plan_activated: ClipboardCheck,
  task_updated: ListChecks,
  payment_updated: CircleDollarSign,
  reminder_created: BellRing,
  reminder_completed: BellRing,
};

export function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) {
    return <p className="py-6 text-sm text-slate-500">Chưa ghi nhận hoạt động nào.</p>;
  }

  return (
    <ol className="divide-y divide-slate-100">
      {activities.map((activity) => {
        const Icon =
          iconByType[activity.type as keyof typeof iconByType] ?? CircleDot;
        return (
          <li key={activity.id} className="flex gap-3 py-4 first:pt-1 last:pb-1">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-slate-700">
                {activity.message}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {formatDateTime(activity.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
