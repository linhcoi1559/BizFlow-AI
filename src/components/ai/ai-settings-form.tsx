"use client";
import { useActionState } from "react";
import { saveAISettingsAction } from "@/app/settings/ai/actions";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-fields";
export function AISettingsForm({
  provider,
  model,
  models,
  sharing,
}: {
  provider: string;
  model: string;
  models: { slug: string; name: string }[];
  sharing: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveAISettingsAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <Field name="provider" label="AI sử dụng">
        <Select name="provider" id="provider" defaultValue={provider}>
          <option value="chatgpt" disabled={!sharing}>
            ChatGPT — dùng gói của bạn
          </option>
          <option value="gemini">Gemini — API hiện có</option>
        </Select>
      </Field>
      <Field name="model" label="Model ChatGPT">
        <Select
          name="model"
          id="model"
          defaultValue={model || models[0]?.slug}
          disabled={!sharing}
        >
          <option value="">Chọn model</option>
          {models.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
      </Field>
      {state.message && (
        <p
          role="status"
          className={
            state.status === "error" ? "text-rose-600" : "text-emerald-700"
          }
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        Lưu lựa chọn AI
      </Button>
    </form>
  );
}
