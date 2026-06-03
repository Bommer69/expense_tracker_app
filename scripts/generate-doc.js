const docx = require('docx');
const fs = require('fs');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType } = docx;

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24, lineSpacing: 360 },
      },
    },
  },
  sections: [{
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'Expense Tracker — Tài liệu dành cho thầy/cô',
            bold: true,
            size: 32,
            font: 'Times New Roman',
          }),
        ],
      }),

      new Paragraph({ spacing: { after: 100 }, children: [] }),

      // 1. APK
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: '1. ', bold: true, size: 26, font: 'Times New Roman' }),
          new TextRun({ text: 'Ứng dụng Android (APK)', bold: true, size: 26, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: 'Tải và cài đặt ứng dụng trên điện thoại Android:', size: 24, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'https://expo.dev/accounts/bommer404/projects/expense-tracker/builds/2a16c2fc-fe4f-405d-8c10-29086747a683',
            size: 22,
            font: 'Times New Roman',
            color: '0563C1',
            underline: { type: 'single' },
          }),
        ],
      }),

      // 2. GitHub
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: '2. ', bold: true, size: 26, font: 'Times New Roman' }),
          new TextRun({ text: 'Mã nguồn (GitHub)', bold: true, size: 26, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: 'Xem toàn bộ mã nguồn frontend (React Native / Expo) và backend (Node.js / Express / MongoDB):', size: 24, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'https://github.com/Bommer69/expense_tracker_app',
            size: 22,
            font: 'Times New Roman',
            color: '0563C1',
            underline: { type: 'single' },
          }),
        ],
      }),

      // Footer
      new Paragraph({ spacing: { before: 400 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: 'Trân trọng,', size: 24, font: 'Times New Roman', italics: true }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Nhóm phát triển Expense Tracker', size: 24, font: 'Times New Roman', italics: true }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('docs/links-for-teachers.docx', buffer);
  console.log('Created docs/links-for-teachers.docx');
});
