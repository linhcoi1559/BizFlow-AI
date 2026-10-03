import { AIWorkspace } from "@/components/ai/ai-workspace";
import { aiConfigured } from "@/services/ai/provider-factory";
export const metadata = { title: "Không gian AI" };
export default async function AIWorkspacePage() {
  return <AIWorkspace configured={await aiConfigured()} />;
}
