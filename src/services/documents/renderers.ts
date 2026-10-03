import "server-only";

import path from "node:path";

import type { Client, CompanyProfile, Project } from "@prisma/client";
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import pdfMake from "pdfmake";
import type {
  Content,
  TableCell as PdfTableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { DocumentContent, DocumentTypeValue } from "@/services/documents/schemas";

export type DocumentRenderInput = {
  document: {
    title: string;
    type: DocumentTypeValue;
    referenceNumber: string;
    approvedAt: Date | null;
    approvedByName: string | null;
  };
  content: DocumentContent;
  company: CompanyProfile | null;
  client: Client;
  project: Project;
};

const navy = "172033";
const slate = "475569";
const lightBorder = "D9D9D9";
const paleBlue = "EEF2FF";

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Chưa cung cấp";
}

function wordCell(
  text: string,
  options: {
    bold?: boolean;
    fill?: string;
    color?: string;
    width: number;
    columnSpan?: number;
  },
) {
  return new TableCell({
    width: { size: options.width, type: WidthType.DXA },
    columnSpan: options.columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: options.fill
      ? { fill: options.fill, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: lightBorder },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: lightBorder },
      left: { style: BorderStyle.SINGLE, size: 1, color: lightBorder },
      right: { style: BorderStyle.SINGLE, size: 1, color: lightBorder },
    },
    children: [
      new Paragraph({
        spacing: { after: 0, line: 260 },
        children: [
          new TextRun({
            text,
            bold: options.bold,
            color: options.color || navy,
            size: 20,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

function wordBodyParagraphs(body: string) {
  return body.split(/\n+/).map(
    (line) =>
      new Paragraph({
        spacing: { after: 180, line: 320 },
        children: [
          new TextRun({
            text: line.trim() || " ",
            size: 22,
            color: navy,
            font: "Arial",
          }),
        ],
      }),
  );
}

function buildInformationTable(input: DocumentRenderInput) {
  const companyName = input.company?.companyName || "Nhà cung cấp dịch vụ";
  const rows: [string, string][] = [
    ["Mã tham chiếu", input.document.referenceNumber],
    ["Nhà cung cấp", companyName],
    ["Khách hàng", input.client.companyName],
    ["Dự án", input.project.name],
    ["Dịch vụ", displayValue(input.project.serviceType)],
    ["Ngày phê duyệt", formatDate(input.document.approvedAt)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value], index) =>
        new TableRow({
          children: [
            wordCell(label, {
              bold: true,
              width: 2_200,
              fill: index % 2 === 0 ? paleBlue : "F8FAFC",
            }),
            wordCell(value, { width: 7_600, fill: index % 2 === 0 ? "FFFFFF" : "F8FAFC" }),
          ],
        }),
    ),
  });
}

function buildPricingTable(input: DocumentRenderInput) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      wordCell("Mô tả", { bold: true, width: 4_600, fill: navy, color: "FFFFFF" }),
      wordCell("SL", { bold: true, width: 900, fill: navy, color: "FFFFFF" }),
      wordCell("Đơn vị", { bold: true, width: 1_200, fill: navy, color: "FFFFFF" }),
      wordCell("Đơn giá", { bold: true, width: 1_800, fill: navy, color: "FFFFFF" }),
      wordCell("Thành tiền", { bold: true, width: 1_800, fill: navy, color: "FFFFFF" }),
    ],
  });
  const rows = input.content.lineItems.map((item, index) => {
    const fill = index % 2 ? "F8FAFC" : "FFFFFF";
    return new TableRow({
      children: [
        wordCell(item.description, { width: 4_600, fill }),
        wordCell(String(item.quantity), { width: 900, fill }),
        wordCell(item.unit, { width: 1_200, fill }),
        wordCell(formatCurrency(item.unitPrice, input.content.currency), { width: 1_800, fill }),
        wordCell(formatCurrency(item.quantity * item.unitPrice, input.content.currency), {
          width: 1_800,
          fill,
          bold: true,
        }),
      ],
    });
  });
  const total = new TableRow({
    children: [
      wordCell("Tổng giá trị dự án", {
        bold: true,
        width: 6_700,
        fill: paleBlue,
        columnSpan: 4,
      }),
      wordCell(formatCurrency(input.content.totalValue, input.content.currency), {
        bold: true,
        width: 3_600,
        fill: paleBlue,
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows, total],
  });
}

export async function renderDocx(input: DocumentRenderInput) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: input.content.title,
          bold: true,
          color: "000000",
          size: 38,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${input.document.referenceNumber}  |  Phiên bản được duyệt ngày ${formatDate(input.document.approvedAt)}`,
          color: slate,
          size: 20,
          font: "Arial",
        }),
      ],
    }),
    buildInformationTable(input),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];

  for (const section of input.content.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            color: "000000",
            size: 28,
            font: "Arial",
          }),
        ],
      }),
      ...wordBodyParagraphs(section.body),
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      spacing: { before: 280, after: 140 },
      children: [new TextRun({ text: "Chi tiết thương mại", bold: true, color: "000000", size: 28, font: "Arial" })],
    }),
    buildPricingTable(input),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      spacing: { before: 260, after: 100 },
      children: [new TextRun({ text: "Điều khoản thanh toán", bold: true, color: "000000", size: 24, font: "Arial" })],
    }),
    ...wordBodyParagraphs(input.content.paymentTerms || "Không có điều khoản thanh toán bổ sung."),
  );

  if (input.content.notes) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "Ghi chú", bold: true, color: "000000", size: 24, font: "Arial" })],
      }),
      ...wordBodyParagraphs(input.content.notes),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 400, after: 80 },
      children: [new TextRun({ text: "Người phê duyệt", bold: true, color: slate, size: 19, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: displayValue(input.document.approvedByName),
          bold: true,
          color: navy,
          size: 22,
          font: "Arial",
        }),
      ],
    }),
  );

  const wordDocument = new WordDocument({
    creator: input.company?.companyName || "BizFlow AI",
    title: input.content.title,
    description: `Tài liệu ${input.document.type} được tạo từ dữ liệu đã phê duyệt trên BizFlow AI`,
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22, color: navy } },
        title: { run: { font: "Arial", size: 38, bold: true, color: "000000" } },
        heading1: { run: { font: "Arial", size: 28, bold: true, color: "000000" } },
        heading2: { run: { font: "Arial", size: 24, bold: true, color: "000000" } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12_240, height: 15_840 },
            margin: { top: 1_080, right: 1_080, bottom: 1_080, left: 1_080 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
            new TextRun({ text: `${input.document.referenceNumber}  |  Trang `, color: "64748B", size: 17, font: "Arial" }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "64748B", size: 17, font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(wordDocument);
}

let pdfFontsReady = false;

function configurePdfFonts() {
  if (pdfFontsReady) return;
  const fontDirectory = path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");
  const resolvedFontDirectory = path.resolve(fontDirectory);
  pdfMake.addFonts({
    Roboto: {
      normal: path.join(fontDirectory, "Roboto-Regular.ttf"),
      bold: path.join(fontDirectory, "Roboto-Medium.ttf"),
      italics: path.join(fontDirectory, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontDirectory, "Roboto-MediumItalic.ttf"),
    },
  });
  pdfMake.setLocalAccessPolicy((requestedPath) => {
    return path.resolve(requestedPath).startsWith(`${resolvedFontDirectory}${path.sep}`);
  });
  pdfMake.setUrlAccessPolicy(() => false);
  pdfFontsReady = true;
}

function pdfInfoRows(input: DocumentRenderInput): PdfTableCell[][] {
  return [
    ["Mã tham chiếu", input.document.referenceNumber],
    ["Nhà cung cấp", input.company?.companyName || "Nhà cung cấp dịch vụ"],
    ["Khách hàng", input.client.companyName],
    ["Dự án", input.project.name],
    ["Dịch vụ", displayValue(input.project.serviceType)],
    ["Ngày phê duyệt", formatDate(input.document.approvedAt)],
  ].map(([label, value], index) => [
    {
      text: label,
      bold: true,
      fillColor: index % 2 ? "#F8FAFC" : "#EEF2FF",
      margin: [4, 5] as [number, number],
    } as PdfTableCell,
    {
      text: value,
      fillColor: index % 2 ? "#F8FAFC" : "#FFFFFF",
      margin: [4, 5] as [number, number],
    } as PdfTableCell,
  ]);
}

export async function renderPdf(input: DocumentRenderInput) {
  configurePdfFonts();

  const content: Content[] = [
    { text: input.content.title, style: "title" },
    {
      text: `${input.document.referenceNumber}  |  Phiên bản được duyệt ngày ${formatDate(input.document.approvedAt)}`,
      style: "subtitle",
      margin: [0, 4, 0, 20],
    },
    {
      table: { widths: [120, "*"], body: pdfInfoRows(input) },
      layout: { hLineColor: () => "#D9D9D9", vLineColor: () => "#D9D9D9" },
      margin: [0, 0, 0, 16],
    },
  ];

  for (const section of input.content.sections) {
    content.push(
      { text: section.heading, style: "heading", margin: [0, 12, 0, 6] },
      { text: section.body, style: "body", margin: [0, 0, 0, 7] },
    );
  }

  const pricingRows: PdfTableCell[][] = [
          ["Mô tả", "SL", "Đơn vị", "Đơn giá", "Thành tiền"].map((text) => ({
      text,
      bold: true,
      color: "#FFFFFF",
      fillColor: "#172033",
      margin: [4, 5] as [number, number],
    }) as PdfTableCell),
    ...input.content.lineItems.map((item, index) => {
      const fillColor = index % 2 ? "#F8FAFC" : "#FFFFFF";
      return [
        item.description,
        String(item.quantity),
        item.unit,
        formatCurrency(item.unitPrice, input.content.currency),
        formatCurrency(item.quantity * item.unitPrice, input.content.currency),
      ].map((text) => ({
        text,
        fillColor,
        margin: [4, 5] as [number, number],
      }) as PdfTableCell);
    }),
    [
      {
              text: "Tổng giá trị dự án",
        colSpan: 4,
        bold: true,
        fillColor: "#EEF2FF",
        margin: [4, 6] as [number, number],
      } as PdfTableCell,
      "" as PdfTableCell,
      "" as PdfTableCell,
      "" as PdfTableCell,
      {
        text: formatCurrency(input.content.totalValue, input.content.currency),
        bold: true,
        fillColor: "#EEF2FF",
        margin: [4, 6] as [number, number],
      } as PdfTableCell,
    ],
  ];

  content.push(
    { text: "Chi tiết thương mại", style: "heading", margin: [0, 14, 0, 7] },
    {
      table: { headerRows: 1, widths: ["*", 36, 50, 78, 80], body: pricingRows },
      layout: { hLineColor: () => "#D9D9D9", vLineColor: () => "#D9D9D9" },
      margin: [0, 0, 0, 12],
    },
    { text: "Điều khoản thanh toán", style: "subheading", margin: [0, 8, 0, 4] },
    { text: input.content.paymentTerms || "Không có điều khoản thanh toán bổ sung.", style: "body" },
  );

  if (input.content.notes) {
    content.push(
      { text: "Ghi chú", style: "subheading", margin: [0, 10, 0, 4] },
      { text: input.content.notes, style: "body" },
    );
  }

  content.push(
    { text: "Người phê duyệt", bold: true, color: "#475569", margin: [0, 22, 0, 3] },
    { text: displayValue(input.document.approvedByName), bold: true },
  );

  const definition: TDocumentDefinitions = {
    pageSize: "LETTER",
    pageMargins: [54, 54, 54, 58],
    info: {
      title: input.content.title,
      author: input.company?.companyName || "BizFlow AI",
    subject: `Tài liệu ${input.document.type} được tạo từ dữ liệu đã phê duyệt trên BizFlow AI`,
    },
    defaultStyle: { font: "Roboto", fontSize: 10.5, color: "#172033", lineHeight: 1.35 },
    styles: {
      title: { fontSize: 21, bold: true, color: "#000000", lineHeight: 1.15 },
      subtitle: { fontSize: 9.5, color: "#475569" },
      heading: { fontSize: 14, bold: true, color: "#000000", lineHeight: 1.2 },
      subheading: { fontSize: 11.5, bold: true, color: "#000000" },
      body: { fontSize: 10.5, color: "#172033", lineHeight: 1.4 },
    },
    footer: (currentPage, pageCount) => ({
          text: `${input.document.referenceNumber}  |  Trang ${currentPage}/${pageCount}`,
      alignment: "center",
      color: "#64748B",
      fontSize: 8,
      margin: [0, 16, 0, 0],
    }),
    content,
  };

  return pdfMake.createPdf(definition).getBuffer();
}

export function safeDownloadName(title: string) {
  const value = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return value || "bizflow-document";
}
