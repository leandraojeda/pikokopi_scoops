require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg'; 

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const misProductos = [
    { id: 'p1', titulo: 'Scoop Piko (Cápsula)', precio: 35, cat: 'scoops', img: '/img/scoop.jpg', variantes: [{ nombre: 'Simple', precio: 35 }, { nombre: 'Doble', precio: 60 }] },
    { id: 'p2', titulo: 'Stickers Piko Kopi', precio: 15, cat: 'productos', img: '/img/stickers.jpg', variantes: [] }
];

app.get('/', (req, res) => {
    res.render('index', { productos: misProductos }); 
});

app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    
    // Limpieza de códigos raros como Ø<ß8
    const limpiarTexto = (t) => t ? String(t).replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑ,()]/g, '') : '';

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. REGISTRAR EN EXCEL
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G', 
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toLocaleString('es-BO'), 
                    limpiarTexto(data.nombre), 
                    data.celular, 
                    data.ciudad, 
                    data.transporte, 
                    data.total, 
                    limpiarTexto(data.productosTexto) // Texto simple para el Excel
                ]]
            }
        });

        // 2. GENERAR PDF CON PRECIOS REALES
        const doc = new PDFDocument({ margin: 40, size: 'A5' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Recibo_PikoKopi.pdf`);
        doc.pipe(res);

        // HEADER
        doc.fillColor('#ffb7c5').fontSize(24).text('PIKO KOPI 🌸', { align: 'center', weight: 'bold' });
        doc.fontSize(9).fillColor('#aaaaaa').text('COMPROBANTE DE PEDIDO', { align: 'center', characterSpacing: 1 });
        doc.moveDown(1.5);

        // CAJA CLIENTE
        doc.roundedRect(40, 90, 340, 70, 8).fill('#fff5f7').stroke('#ffdae0');
        doc.fillColor('#ff85a2').fontSize(8).text('DETALLES DEL ENVÍO', 50, 100, { weight: 'bold' });
        doc.fillColor('#444444').fontSize(9);
        doc.text(`Cliente: ${limpiarTexto(data.nombre)}`, 50, 115);
        doc.text(`Ciudad: ${data.ciudad}`, 50, 130);
        doc.text(`WhatsApp: ${data.celular}`, 210, 115);
        doc.text(`Envío: ${data.transporte}`, 210, 130);

        doc.moveDown(4.5);

        // TABLA PRODUCTOS
        const tableTop = 180;
        doc.fillColor('#ff85a2').fontSize(9);
        doc.text('PRODUCTO', 50, tableTop, { weight: 'bold' });
        doc.text('CANT.', 260, tableTop, { width: 40, align: 'center' });
        doc.text('PRECIO', 320, tableTop, { width: 60, align: 'right' });
        
        doc.moveTo(40, tableTop + 12).lineTo(380, tableTop + 12).strokeColor('#ffdae0').stroke();

        let currentY = tableTop + 22;
        
        // Usamos la lista de objetos que enviaremos desde el front
        const listaParaPDF = data.carrito || [];

        doc.fillColor('#444444').fontSize(9);
        listaParaPDF.forEach(item => {
            const nombreCompleto = `${item.titulo} ${item.variante ? '('+item.variante+')' : ''}`;
            doc.text(limpiarTexto(nombreCompleto), 50, currentY, { width: 200 });
            doc.text('1', 260, currentY, { width: 40, align: 'center' });
            doc.text(`${item.precio} BS`, 320, currentY, { width: 60, align: 'right' });
            currentY += 15;

            if (currentY > 480) doc.addPage();
        });

        // TOTAL FINAL
        currentY += 10;
        doc.roundedRect(220, currentY, 160, 30, 5).fill('#ff85a2');
        doc.fillColor('#ffffff').fontSize(12).text(`TOTAL: ${data.total}`, 230, currentY + 10, { 
            width: 140, align: 'right', weight: 'bold'
        });

        doc.end();

    } catch (e) {
        console.error("❌ ERROR:", e.message);
        if (!res.headersSent) res.status(500).send("Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🌸 Piko Kopi en http://localhost:${PORT}`);
});