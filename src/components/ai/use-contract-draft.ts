"use client";
import { useEffect, useState } from "react";
import { emptyContractDraft, readContractDraft, encodeContractDraft, type ContractDraft } from "@/lib/contract-draft";

export function useContractDraft(storageKey: string, clientIds: string[], templateIds: string[]) {
  const [fields, setFields] = useState(emptyContractDraft);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Đang kiểm tra bản nhập đã lưu…");
  useEffect(() => {
    // Defer browser storage access until hydration, before enabling the form.
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        const restored = readContractDraft(raw);
        if (restored) {
          const unavailable = (restored.clientId && !clientIds.includes(restored.clientId)) ||
            (restored.templateId && !templateIds.includes(restored.templateId));
          setFields({ ...restored,
            clientId: clientIds.includes(restored.clientId) ? restored.clientId : "",
            templateId: templateIds.includes(restored.templateId) ? restored.templateId : "",
          });
          setMessage(unavailable ? "Đã khôi phục nội dung. Khách hàng hoặc mẫu cũ không còn khả dụng; hãy chọn lại và kiểm tra thông tin." : "Đã khôi phục bản nhập đã lưu trên trình duyệt này.");
        } else {
          setMessage(raw ? "Bản nhập cũ không hợp lệ. Bạn có thể nhập lại để tự động lưu." : "Nội dung nhập sẽ tự động lưu trên trình duyệt này.");
        }
      } catch { setMessage("Trình duyệt không cho phép lưu bản nhập. Nội dung hiện chỉ giữ trong trang này."); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey, clientIds, templateIds]);
  function update(next: ContractDraft) {
    setFields(next);
    try {
      localStorage.setItem(storageKey, encodeContractDraft(next));
      setMessage("Đã tự động lưu nội dung trên trình duyệt này.");
    } catch { setMessage("Chưa lưu được trên trình duyệt. Giữ trang này mở để tránh mất nội dung."); }
  }
  function clear() {
    try {
      localStorage.removeItem(storageKey);
      setFields(emptyContractDraft);
      setMessage("Đã xóa bản nhập đã lưu.");
      return true;
    } catch {
      setMessage("Không xóa được bản nhập đã lưu. Hãy kiểm tra quyền lưu trữ của trình duyệt.");
      return false;
    }
  }
  return { fields, ready, message, update, clear };
}
