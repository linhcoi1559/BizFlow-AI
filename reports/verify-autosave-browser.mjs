import assert from "node:assert/strict";
import esbuild from "esbuild";
import playwright from "file:///D:/MYB_DATA/DevTools/node_modules/playwright/index.js";

const { chromium } = playwright;

(async () => {
  const fixtureActions = `
const content={title:'Hợp đồng thử',totalValue:10000000,currency:'VND',sections:[{key:'parties',heading:'Thông tin các bên',body:'Bên A và B'},{key:'commercial',heading:'Điều kiện thương mại',body:'Giá trị đã xác nhận'},{key:'ai_clause_0',heading:'Phạm vi',body:'Nội dung thử'}]};
const revised={...content,sections:[...content.sections.slice(0,2),{key:'ai_clause_0',heading:'Phạm vi và nghiệm thu',body:'Bao gồm 04 vòng chỉnh sửa và phản hồi trong 05 ngày.'}]};
export async function previewContractAction(_state,form){if(String(form.get('purpose')).includes('Luồng trợ lý'))return {status:'preview',message:'Cần xem xét',fieldErrors:{},content,missingFields:['Cần xác nhận thời hạn nghiệm thu.'],ticket:'preview-ticket'};return {status:'error',message:'Fixture error',fieldErrors:{},content:null,missingFields:[],ticket:''}}
export async function reviseContractAction(previous,form){return {status:'ready',message:'AI đã cập nhật trực tiếp bản hợp đồng theo yêu cầu của bạn.',baseTicket:String(form.get('baseTicket')),ticket:'revised-ticket',content:revised,missingFields:['Cần xác nhận thời hạn nghiệm thu.'],manualChanges:[{field:'totalValue',instruction:'Nếu đã thống nhất giá mới, sửa Tổng giá trị ở biểu mẫu phía trên.'}],messages:[...(previous.messages||[]),{role:'user',text:String(form.get('message'))},{role:'assistant',text:'Đã thêm 04 vòng chỉnh sửa và thời hạn phản hồi 05 ngày.'}]}}
export async function confirmContractAction(){throw Error('must not confirm')}`;
  const bundle = await esbuild.build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ContractWizard} from './src/components/ai/contract-wizard'; const scope=new URLSearchParams(location.search).get('scope') || 'a'; createRoot(document.getElementById('root')).render(<ContractWizard configured={true} draftStorageKey={'fixture:'+scope} clients={[{id:'c1',companyName:'Khách hàng mẫu',address:'Địa chỉ mẫu',representativeName:'Người đại diện',taxCode:'123',email:'demo@example.test',phone:'0901234567'}]} templates={[{id:'t1',name:'Mẫu thử'}]}/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    plugins: [
      {
        name: "fixtures",
        setup(build) {
          build.onResolve(
            { filter: /^@\/app\/contracts\/new\/actions$/ },
            () => ({ path: "actions", namespace: "fixture" }),
          );
          build.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
          build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents: args.path === "link"
              ? `import React from 'react'; export default function Link({children,...props}){ return <a {...props}>{children}</a> }`
              : fixtureActions,
            loader: "tsx",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("http://draft.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<div id="root"></div><script>${bundle.outputFiles[0].text}</script>` }));
    await page.goto("http://draft.test/");
    await page.locator("#name").fill("Nguyễn Văn A");
    await page.locator("#address").fill("Địa chỉ đã nhập");
    await page.locator("#partyKind").selectOption("individual");
    await page.locator("#birthDate").fill("1990-01-02");
    await page.locator("#identityNumber").fill("0123456789");
    await page.locator("#purpose").fill("Thiết kế website bán hàng");
    await page.locator("#paymentTerms").fill("50% khi ký hợp đồng");
    await page.locator("#totalValue").fill("10000000");
    await page.locator("#startDate").fill("2026-10-03");
    await page.locator("#endDate").fill("2026-11-03");
    await page.locator("#templateId").selectOption("t1");
    await page.locator("[name=acknowledgeDuplicate]").check();
    await page.getByRole("button", { name: "AI soạn hợp đồng", exact: true }).click();
    await page.getByText("Fixture error").waitFor();
    assert.equal(await page.locator("#purpose").inputValue(), "Thiết kế website bán hàng");
    await page.reload();
    await page.getByText("Đã khôi phục bản nhập đã lưu trên trình duyệt này.", { exact: true }).waitFor();
    assert.equal(await page.locator("#name").inputValue(), "Nguyễn Văn A");
    assert.equal(await page.locator("#birthDate").inputValue(), "1990-01-02");
    assert.equal(await page.locator("#identityNumber").inputValue(), "0123456789");
    assert.equal(await page.locator("#templateId").inputValue(), "t1");
    assert.equal(await page.locator("[name=acknowledgeDuplicate]").isChecked(), false);
    await page.goto("http://draft.test/?scope=b");
    await page.locator("#name").fill("Tài khoản khác");
    await page.goto("http://draft.test/?scope=a");
    await page.getByText("Đã khôi phục bản nhập đã lưu trên trình duyệt này.", { exact: true }).waitFor();
    assert.equal(await page.locator("#name").inputValue(), "Nguyễn Văn A");
    await page.locator("#clientId").selectOption("c1");
    assert.equal(await page.locator("#name").inputValue(), "Khách hàng mẫu");
    assert.equal(await page.locator("#purpose").inputValue(), "Thiết kế website bán hàng");
    await page.reload();
    await page.getByText("Đã khôi phục bản nhập đã lưu trên trình duyệt này.", { exact: true }).waitFor();
    assert.equal(await page.locator("#clientId").inputValue(), "c1");
    await page.getByRole("button", { name: "Xóa bản nhập đã lưu" }).click();
    assert.equal(await page.locator("#name").inputValue(), "");
    await page.reload();
    await page.locator("#name").fill("Mới");
    assert.equal(await page.locator("#purpose").inputValue(), "");
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await page.locator("#purpose").fill("Nội dung còn trong form");
    await page.getByText("Chưa lưu được trên trình duyệt. Giữ trang này mở để tránh mất nội dung.", { exact: true }).waitFor();
    assert.equal(await page.locator("#purpose").inputValue(), "Nội dung còn trong form");

    await page.goto("http://draft.test/?scope=assistant");
    await page.locator("#name").fill("Khách hàng trợ lý");
    await page.locator("#address").fill("Địa chỉ khách hàng");
    await page.locator("#partyKind").selectOption("individual");
    await page.locator("#purpose").fill("Luồng trợ lý soạn hợp đồng");
    await page.locator("#paymentTerms").fill("50% khi ký, 50% khi nghiệm thu");
    await page.locator("#totalValue").fill("10000000");
    await page.locator("#startDate").fill("2026-10-03");
    await page.locator("#endDate").fill("2026-11-03");
    await page.locator("[name=acknowledgeDuplicate]").check();
    await page.getByRole("button", { name: "AI soạn hợp đồng", exact: true }).click();
    await page.getByRole("button", { name: "Gửi cho AI và cập nhật hợp đồng" }).waitFor();
    await page.getByLabel("Nhắn cho AI").fill("Hãy tự hoàn thiện toàn bộ, thêm 04 vòng chỉnh sửa và giải thích thay đổi.");
    await page.getByRole("button", { name: "Gửi cho AI và cập nhật hợp đồng" }).click();
    await page.getByText("Đã thêm 04 vòng chỉnh sửa và thời hạn phản hồi 05 ngày.").waitFor();
    await page.getByText(/Bao gồm 04 vòng chỉnh sửa/).waitFor();
    await page.getByText("Thông tin cần nhân sự sửa trực tiếp").waitFor();
    await page.getByRole("button", { name: "Đi tới ô cần sửa" }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "totalValue");
    await page.getByLabel("Nhân sự đã kiểm tra và chấp nhận lưu dù AI vẫn còn cảnh báo.").check();
    await page.getByLabel("Tôi đã kiểm tra thông tin và xác nhận lưu bản nháp này.").check();
    assert.equal(await page.getByRole("button", { name: "Xác nhận và lưu bản nháp" }).isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log("PASS: actual wizard autosave and free-form contract chat revise the preview, explain changes, point to manual fields, and allow an explicit human override without database/provider calls.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
