import { AIProviderError } from "../errors";

export async function completedStream(response: Response) {
  if (!response.body)
    throw new AIProviderError("OpenAI không trả về nội dung.");
  let buffer = "",
    text = "",
    completed = false;
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  function event(block: string) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    const item = JSON.parse(data);
    if (
      item.type === "response.output_text.delta" &&
      typeof item.delta === "string"
    )
      text += item.delta;
    if (item.type === "response.completed") completed = true;
    if (
      ["response.failed", "response.incomplete", "error"].includes(item.type)
    ) {
      const code = item.response?.error?.code || item.code;
      throw new AIProviderError(
        String(code).startsWith("subscription_sharing")
          ? "Gói ChatGPT đã đạt giới hạn hoặc chưa cho phép app sử dụng. Mở Cài đặt AI để kiểm tra quyền và hạn mức."
          : "OpenAI chưa hoàn thành yêu cầu. Hãy thử lại.",
      );
    }
    if (item.type === "response.refusal.delta")
      throw new AIProviderError(
        "AI không thể thực hiện yêu cầu này. Hãy kiểm tra lại nội dung.",
      );
    if (text.length > 200_000 || buffer.length > 1_000_000)
      throw new AIProviderError("Kết quả AI vượt giới hạn xử lý.");
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 1_000_000)
        throw new AIProviderError("Kết quả AI vượt giới hạn xử lý.");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        event(block);
      }
      if (done) break;
    }
    if (buffer.trim()) event(buffer);
    if (!completed || !text.trim())
      throw new AIProviderError(
        "Kết nối bị ngắt trước khi AI hoàn tất. Bản nháp chưa được lưu; hãy thử lại.",
      );
    return text;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
