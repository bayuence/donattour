const fs = require('fs');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } = require('docx');

function createHeading(text, level) {
    return new Paragraph({
        text: text,
        heading: level,
        spacing: { before: 200, after: 100 },
        alignment: level === HeadingLevel.HEADING_1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    });
}

function createText(text, bold = false, italic = false) {
    return new Paragraph({
        children: [new TextRun({ text, bold, italic })],
        spacing: { after: 100 }
    });
}

function createTable(headers, rowsData) {
    const tableRows = [];
    
    // Header Row
    const headerCells = headers.map(header => new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: header, bold: true, color: "FFFFFF" })],
            alignment: AlignmentType.CENTER
        })],
        shading: { fill: "1B365D" },
        width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE }
    }));
    tableRows.push(new TableRow({ children: headerCells }));

    // Data Rows
    rowsData.forEach((row, idx) => {
        const cells = row.map((cellText, cIdx) => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: String(cellText), bold: cIdx === 0 || cIdx === row.length - 1 })],
                alignment: cIdx === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT
            })],
            shading: { fill: idx % 2 === 0 ? "F2F5F8" : "FFFFFF" }
        }));
        tableRows.push(new TableRow({ children: cells }));
    });

    return new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
    });
}

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            createHeading("LAPORAN DATA PENJUALAN & PENDAPATAN PETRONITE", HeadingLevel.HEADING_1),
            createHeading("Periode: 27 Juni - 5 Juli 2026", HeadingLevel.HEADING_2),
            createText("Dokumen ini berisi rekapitulasi lengkap jumlah donat terjual, pendapatan per kategori, serta rincian perhitungan satuan dikali harga per tanggal.", false, true),
            
            createHeading("1. Tabel Rekapitulasi Jumlah Produk Terjual", HeadingLevel.HEADING_2),
            createTable(
                ["TANGGAL", "KLASIK", "REGULER", "PREMIUM", "TOTAL", "MINERAL", "SOJU", "CENDOL", "SAGO", "ROASTED", "BOLEN", "KRESEK"],
                [
                    ["27/06/2026", "50", "409", "74", "533", "38", "5", "-", "-", "-", "74", "33"],
                    ["28/06/2026", "46", "465", "110", "621", "18", "1", "-", "2", "-", "35", "91"],
                    ["29/06/2026", "61", "442", "102", "605", "13", "2", "-", "2", "3", "74", "69"],
                    ["30/06/2026", "41", "385", "88", "514", "17", "1", "-", "-", "4", "61", "51"],
                    ["01/07/2026", "69", "411", "108", "588", "10", "2", "-", "-", "1", "60", "63"],
                    ["02/07/2026", "78", "510", "90", "678", "28", "2", "-", "-", "1", "58", "100"],
                    ["03/07/2026", "59", "515", "117", "691", "14", "5", "-", "-", "-", "53", "100"],
                    ["04/07/2026", "87", "742", "121", "950", "35", "-", "4", "-", "-", "84", "140"],
                    ["05/07/2026", "69", "711", "113", "893", "10", "-", "5", "-", "1", "65", "50"]
                ]
            ),
            
            createHeading("2. Tabel Rekapitulasi Pendapatan", HeadingLevel.HEADING_2),
            createTable(
                ["TANGGAL", "KLASIK", "REGULER", "PREMIUM", "MINERAL", "SOJU", "CENDOL", "SAGO", "ROASTED", "BOLEN", "KRESEK", "TOTAL"],
                [
                    ["27/06/2026", "Rp350.000", "Rp4.090.000", "Rp1.110.000", "Rp190.000", "Rp175.000", "-", "-", "-", "Rp481.000", "Rp33.000", "Rp6.429.000"],
                    ["28/06/2026", "Rp322.000", "Rp4.650.000", "Rp1.650.000", "Rp90.000", "Rp35.000", "-", "Rp40.000", "-", "Rp253.500", "Rp91.000", "Rp7.131.500"],
                    ["29/06/2026", "Rp427.000", "Rp4.420.000", "Rp1.530.000", "Rp65.000", "Rp70.000", "-", "Rp40.000", "Rp66.000", "Rp481.000", "Rp69.000", "Rp7.128.000"],
                    ["30/06/2026", "Rp287.000", "Rp3.850.000", "Rp1.320.000", "Rp85.000", "Rp35.000", "-", "-", "Rp88.000", "Rp396.500", "Rp51.000", "Rp6.112.500"],
                    ["01/07/2026", "Rp483.000", "Rp4.110.000", "Rp1.620.000", "Rp50.000", "Rp70.000", "-", "-", "Rp22.000", "Rp390.000", "Rp63.000", "Rp6.808.000"],
                    ["02/07/2026", "Rp546.000", "Rp5.100.000", "Rp1.350.000", "Rp140.000", "Rp70.000", "-", "-", "Rp22.000", "Rp377.000", "Rp100.000", "Rp7.705.000"],
                    ["03/07/2026", "Rp413.000", "Rp5.150.000", "Rp1.755.000", "Rp70.000", "Rp175.000", "-", "-", "-", "Rp344.500", "Rp100.000", "Rp8.007.500"],
                    ["04/07/2026", "Rp609.000", "Rp7.420.000", "Rp1.815.000", "Rp175.000", "-", "Rp72.000", "-", "-", "Rp546.000", "Rp140.000", "Rp10.777.000"],
                    ["05/07/2026", "Rp483.000", "Rp7.110.000", "Rp1.695.000", "Rp50.000", "-", "Rp90.000", "-", "Rp22.000", "Rp422.500", "Rp50.000", "Rp9.922.500"]
                ]
            ),
            
            createHeading("3. Rincian Perhitungan Harian (Satuan x Harga)", HeadingLevel.HEADING_2),
            
            // 27 Juni
            createHeading("Tanggal: 27 Juni 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik", "50", "Rp 7.000", "Rp 350.000"],
                ["Donat Reguler", "409", "Rp 10.000", "Rp 4.090.000"],
                ["Donat Premium", "74", "Rp 15.000", "Rp 1.110.000"],
                ["Mineral", "38", "Rp 5.000", "Rp 190.000"],
                ["Soju", "5", "Rp 35.000", "Rp 175.000"],
                ["Bolen", "74", "Rp 6.500", "Rp 481.000"],
                ["Kresek", "33", "Rp 1.000", "Rp 33.000"],
                ["TOTAL", "533 (Donat)", "-", "Rp 6.429.000"]
            ]),
            
            // 28 Juni
            createHeading("Tanggal: 28 Juni 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik", "46", "Rp 7.000", "Rp 322.000"],
                ["Donat Reguler", "465", "Rp 10.000", "Rp 4.650.000"],
                ["Donat Premium", "110", "Rp 15.000", "Rp 1.650.000"],
                ["Mineral", "18", "Rp 5.000", "Rp 90.000"],
                ["Soju", "1", "Rp 35.000", "Rp 35.000"],
                ["Sago", "2", "Rp 20.000", "Rp 40.000"],
                ["Bolen", "39", "Rp 6.500", "Rp 253.500"],
                ["Kresek", "91", "Rp 1.000", "Rp 91.000"],
                ["TOTAL", "621 (Donat)", "-", "Rp 7.131.500"]
            ]),

            // 29 Juni
            createHeading("Tanggal: 29 Juni 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik", "61", "Rp 7.000", "Rp 427.000"],
                ["Donat Reguler", "442", "Rp 10.000", "Rp 4.420.000"],
                ["Donat Premium", "102", "Rp 15.000", "Rp 1.530.000"],
                ["Mineral", "13", "Rp 5.000", "Rp 65.000"],
                ["Soju", "2", "Rp 35.000", "Rp 70.000"],
                ["Sago", "2", "Rp 20.000", "Rp 40.000"],
                ["Roasted", "3", "Rp 22.000", "Rp 66.000"],
                ["Bolen", "74", "Rp 6.500", "Rp 481.000"],
                ["Kresek", "69", "Rp 1.000", "Rp 69.000"],
                ["TOTAL", "605 (Donat)", "-", "Rp 7.128.000"]
            ]),

            // 30 Juni
            createHeading("Tanggal: 30 Juni 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik", "41", "Rp 7.000", "Rp 287.000"],
                ["Donat Reguler", "385", "Rp 10.000", "Rp 3.850.000"],
                ["Donat Premium", "88", "Rp 15.000", "Rp 1.320.000"],
                ["Mineral", "17", "Rp 5.000", "Rp 85.000"],
                ["Soju", "1", "Rp 35.000", "Rp 35.000"],
                ["Roasted", "4", "Rp 22.000", "Rp 88.000"],
                ["Bolen", "61", "Rp 6.500", "Rp 396.500"],
                ["Kresek", "51", "Rp 1.000", "Rp 51.000"],
                ["TOTAL", "514 (Donat)", "-", "Rp 6.112.500"]
            ]),

            // 1 Juli
            createHeading("Tanggal: 01 Juli 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik", "69", "Rp 7.000", "Rp 483.000"],
                ["Donat Reguler", "411", "Rp 10.000", "Rp 4.110.000"],
                ["Donat Premium", "108", "Rp 15.000", "Rp 1.620.000"],
                ["Mineral", "10", "Rp 5.000", "Rp 50.000"],
                ["Soju", "2", "Rp 35.000", "Rp 70.000"],
                ["Roasted", "1", "Rp 22.000", "Rp 22.000"],
                ["Bolen", "60", "Rp 6.500", "Rp 390.000"],
                ["Kresek", "63", "Rp 1.000", "Rp 63.000"],
                ["TOTAL", "588 (Donat)", "-", "Rp 6.808.000"]
            ]),

            // 2 Juli
            createHeading("Tanggal: 02 Juli 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik (DB)", "78", "Rp 7.000", "Rp 546.000"],
                ["Donat Reguler", "510", "Rp 10.000", "Rp 5.100.000"],
                ["Donat Premium", "90", "Rp 15.000", "Rp 1.350.000"],
                ["Mineral (DB)", "28", "Rp 5.000", "Rp 140.000"],
                ["Soju (DB)", "2", "Rp 35.000", "Rp 70.000"],
                ["Roasted (DB)", "1", "Rp 22.000", "Rp 22.000"],
                ["Bolen (DB)", "58", "Rp 6.500", "Rp 377.000"],
                ["Kresek", "100", "Rp 1.000", "Rp 100.000"],
                ["TOTAL", "678 (Donat)", "-", "Rp 7.705.000"]
            ]),

            // 3 Juli
            createHeading("Tanggal: 03 Juli 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik (DB)", "59", "Rp 7.000", "Rp 413.000"],
                ["Donat Reguler", "515", "Rp 10.000", "Rp 5.150.000"],
                ["Donat Premium (DB)", "117", "Rp 15.000", "Rp 1.755.000"],
                ["Mineral (DB)", "14", "Rp 5.000", "Rp 70.000"],
                ["Soju (DB)", "5", "Rp 35.000", "Rp 175.000"],
                ["Bolen (DB)", "53", "Rp 6.500", "Rp 344.500"],
                ["Kresek", "100", "Rp 1.000", "Rp 100.000"],
                ["TOTAL", "691 (Donat)", "-", "Rp 8.007.500"]
            ]),

            // 4 Juli
            createHeading("Tanggal: 04 Juli 2026 (Puncak Acara)", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik (DB)", "87", "Rp 7.000", "Rp 609.000"],
                ["Donat Reguler", "742", "Rp 10.000", "Rp 7.420.000"],
                ["Donat Premium (DB)", "121", "Rp 15.000", "Rp 1.815.000"],
                ["Mineral (DB)", "35", "Rp 5.000", "Rp 175.000"],
                ["Cendol (DB)", "4", "Rp 18.000", "Rp 72.000"],
                ["Bolen (DB)", "84", "Rp 6.500", "Rp 546.000"],
                ["Kresek (Max)", "140", "Rp 1.000", "Rp 140.000"],
                ["TOTAL", "950 (Donat)", "-", "Rp 10.777.000"]
            ]),

            // 5 Juli
            createHeading("Tanggal: 05 Juli 2026", HeadingLevel.HEADING_3),
            createTable(["Produk", "Qty", "Harga Satuan", "Total"], [
                ["Donat Klasik (DB)", "69", "Rp 7.000", "Rp 483.000"],
                ["Donat Reguler", "711", "Rp 10.000", "Rp 7.110.000"],
                ["Donat Premium (DB)", "113", "Rp 15.000", "Rp 1.695.000"],
                ["Mineral (DB)", "10", "Rp 5.000", "Rp 50.000"],
                ["Cendol (DB)", "5", "Rp 18.000", "Rp 90.000"],
                ["Roasted (DB)", "1", "Rp 22.000", "Rp 22.000"],
                ["Bolen (DB)", "65", "Rp 6.500", "Rp 422.500"],
                ["Kresek", "50", "Rp 1.000", "Rp 50.000"],
                ["TOTAL", "893 (Donat)", "-", "Rp 9.922.500"]
            ])
        ]
    }]
});

const outputPath = 'C:\\Users\\bayue\\Desktop\\Laporan_Data_Petronite_2026.docx';
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log("SUCCESS: Dokumen Word berhasil disimpan di Desktop -> " + outputPath);
}).catch((err) => {
    console.error("ERROR:", err);
});
