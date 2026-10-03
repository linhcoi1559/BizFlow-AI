import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FormSubmit } from "@/components/ui/form-submit";
import { Button, buttonVariants } from "@/components/ui/button";
import { AISettingsForm } from "@/components/ai/ai-settings-form";
import {
  requireOrganizationRole,
  WORKSPACE_EDITOR_ROLES,
} from "@/lib/organization";
import {
  connectionView,
  listModels,
  localEnabled,
} from "@/services/ai/chatgpt/connection";
import { scopeKey } from "@/services/ai/chatgpt/security";
import {
  connectChatGPTAction,
  disconnectChatGPTAction,
  selectChatGPTProfileAction,
} from "./actions";
export const metadata = { title: "Kết nối AI" };
const messages: Record<string, string> = {
  connected: "Đã kết nối ChatGPT. Chọn model bên dưới rồi lưu để bắt đầu.",
  permission:
    "Đã đăng nhập nhưng chưa cấp quyền sử dụng gói. Kết nối lại và cho phép BizFlow sử dụng gói ChatGPT.",
  error:
    "Chưa kết nối được ChatGPT. Bạn có thể thử lại; quyền dùng gói còn phụ thuộc điều kiện tài khoản của OpenAI.",
  disconnected: "Đã ngắt kết nối ChatGPT.",
  "local-disconnected":
    "Đã xóa phiên trên máy này. Chưa xác nhận được thu hồi phiên ở OpenAI; hãy ngắt quyền app trong Cài đặt ChatGPT.",
};
export default async function AISettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string }>;
}) {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  const params = await searchParams;
  const enabled = localEnabled();
  const key = scopeKey(organization.id, user.id);
  const view = enabled ? await connectionView(key) : null;
  let models: { slug: string; name: string }[] = [],
    error = "";
  if (view?.sharing) {
    try {
      models = await listModels(key);
    } catch (failure) {
      error =
        failure instanceof Error ? failure.message : "Chưa tải được model.";
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Kết nối AI"
        description="Kết nối gói ChatGPT của bạn để phân tích yêu cầu và soạn bản nháp hợp đồng."
        actions={
          <Link href="/contracts/new" className={buttonVariants()}>
            Tạo hợp đồng bằng AI
          </Link>
        }
      />
      {params.connection && messages[params.connection] && (
        <Card className="p-4">
          <p role="status">{messages[params.connection]}</p>
        </Card>
      )}
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-bold">ChatGPT của bạn</h2>
        <p className="text-sm text-slate-600">
          Bạn đăng nhập và cấp quyền trên trang OpenAI. Hạn mức gói Plus được
          dùng chung với các app khác; có thể quản lý quyền và hạn mức tại
          ChatGPT.
        </p>
        {!enabled ? (
          <p>Chức năng này chỉ bật cho bản BizFlow chạy cục bộ trên máy bạn.</p>
        ) : (
          <>
            {view?.profiles.map((profile, index) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span>
                  {profile.email} · Kết nối {index + 1}{" "}
                  {profile.selected ? "· Đang chọn" : ""}{" "}
                  {profile.connected ? "· Đã đăng nhập" : "· Cần kết nối lại"}
                </span>
                {!profile.selected && (
                  <form action={selectChatGPTProfileAction}>
                    <input type="hidden" name="profileId" value={profile.id} />
                    <Button type="submit" variant="secondary">
                      Chọn
                    </Button>
                  </form>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <form action={connectChatGPTAction}>
                <FormSubmit
                  label={
                    view?.connected
                      ? "Kết nối lại với ChatGPT"
                      : "Continue with ChatGPT"
                  }
                  pendingLabel="Đang mở trang đăng nhập…"
                />
              </form>
              {Boolean(view?.profiles.length) && (
                <form action={connectChatGPTAction}>
                  <input type="hidden" name="newProfile" value="true" />
                  <Button type="submit" variant="secondary">
                    Thêm tài khoản ChatGPT
                  </Button>
                </form>
              )}
              {view?.connected && (
                <form action={disconnectChatGPTAction}>
                  <Button type="submit" variant="secondary">
                    Ngắt kết nối
                  </Button>
                </form>
              )}
              <a
                href="https://chatgpt.com/settings/usage"
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary" })}
              >
                Quản lý hạn mức
              </a>
            </div>
            {error && (
              <p role="alert" className="text-rose-600">
                {error}
              </p>
            )}
            <AISettingsForm
              provider={view!.provider}
              model={view!.model}
              sharing={view!.sharing}
              models={models}
            />
          </>
        )}
      </Card>
    </div>
  );
}
