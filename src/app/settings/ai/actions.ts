"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireOrganizationRole,
  WORKSPACE_EDITOR_ROLES,
} from "@/lib/organization";
import { scopeKey } from "@/services/ai/chatgpt/security";
import {
  beginSignIn,
  cancelSignIn,
  requireLocalRuntime,
  disconnect,
  listModels,
} from "@/services/ai/chatgpt/connection";
import { updateConnections } from "@/services/ai/chatgpt/store";
import type { ActionState } from "@/lib/action-state";

export async function connectChatGPTAction(formData: FormData) {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  const origin = await requireLocalRuntime();
  let url: string;
  try {
    url = await beginSignIn(
      scopeKey(organization.id, user.id),
      organization.id,
      user.id,
      origin,
      formData.get("newProfile") === "true",
    );
  } catch {
    redirect("/settings/ai?connection=error");
  }
  redirect(url);
}
export async function disconnectChatGPTAction() {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  await requireLocalRuntime();
  const revoked = await disconnect(scopeKey(organization.id, user.id));
  revalidatePath("/settings/ai");
  revalidatePath("/ai-workspace");
  redirect(
    "/settings/ai?connection=" +
      (revoked ? "disconnected" : "local-disconnected"),
  );
}
export async function selectChatGPTProfileAction(formData: FormData) {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  await requireLocalRuntime();
  cancelSignIn(scopeKey(organization.id, user.id));
  await updateConnections(scopeKey(organization.id, user.id), (record) => {
    const id = String(formData.get("profileId") || "");
    if (!record.profiles.some((profile) => profile.clientId === id))
      throw new Error("Kết nối không hợp lệ.");
    record.activeId = id;
  });
  revalidatePath("/settings/ai");
  revalidatePath("/ai-workspace");
}
export async function saveAISettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization, user } = await requireOrganizationRole(
    WORKSPACE_EDITOR_ROLES,
  );
  await requireLocalRuntime();
  const key = scopeKey(organization.id, user.id);
  const provider = formData.get("provider");
  const model = String(formData.get("model") || "");
  try {
    if (provider !== "gemini" && provider !== "chatgpt")
      throw new Error("Chọn nhà cung cấp hợp lệ.");
    if (
      provider === "chatgpt" &&
      !(await listModels(key)).some((item) => item.slug === model)
    )
      throw new Error("Chọn model khả dụng cho tài khoản của bạn.");
    await updateConnections(key, (record) => {
      if (provider === "chatgpt") {
        const profile = record.profiles.find(
          (item) => item.clientId === record.activeId,
        );
        if (!profile) throw new Error("Hãy kết nối ChatGPT trước.");
        profile.model = model;
      }
      record.provider = provider;
    });
    revalidatePath("/ai-workspace");
    revalidatePath("/settings/ai");
    return {
      status: "success",
      message: "Đã lưu lựa chọn AI cho tài khoản BizFlow của bạn.",
      fieldErrors: {},
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Không lưu được cài đặt.",
      fieldErrors: {},
    };
  }
}
