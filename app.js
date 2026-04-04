require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg';

const privateKey = process.env.GOOGLE_PRIVATE_KEY 
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// LISTA DE PRODUCTOS
const listaProductos = [
    { id: '1', titulo: 'Notas Cabeza Snoopy', cat: 'productos', precio: 12, img: '/img/notas-snoopy.jpg' },
    { id: '2', titulo: 'Binder Sanrio', cat: 'productos', precio: 26, img: '/img/binder-sanrio.jpg' },
    { id: '3', titulo: 'Sticker Black and White Style', cat: 'productos', precio: 8, img: '/img/sticker-bw.jpg' },
    { id: '4', titulo: 'Figuras de Yeso Sanrio', cat: 'productos', precio: 5, img: '/img/figuras-yeso.jpg' },
    { id: '5', titulo: 'Sellos en Tira', cat: 'productos', precio: 15, img: '/img/sellos-tira.jpg' },
    { id: '6', titulo: 'Llaveros Snoopy Goma', cat: 'productos', precio: 7, img: '/img/llaveros-snoopy.jpg' },
    { id: '7', titulo: 'Boligrafo Hello Kitty', cat: 'productos', precio: 5, img: '/img/boligrafo-hellokitty.jpg' },
    { id: '8', titulo: 'Binder Hello Kitty JEAN', cat: 'productos', precio: 40, img: '/img/binder-hellokitty-jean.jpg' },
    { id: '9', titulo: 'Scoop Simple', cat: 'scoops', precio: 100, img: '/img/scoop.jpg' },
    { id: '10', titulo: 'Capsulas Extra', cat: 'scoops', precio: 30, img: '/img/capsulas-extra.jpg' },
    { id: '11', titulo: 'Scoop + Capsulas Combo', cat: 'scoops', precio: 150, img: '/img/scoop-capsulas.jpg' },
    { id: '12', titulo: 'Pack de Snoopy', cat: 'packs', precio: 80, img: '/img/pack-snoopy.jpg' },
    { id: '13', titulo: 'Pack de Cinamorroll', cat: 'packs', precio: 80, img: '/img/pack-cinamorroll.jpg' },
    { id: '14', titulo: 'Pack de My Melody', cat: 'packs', precio: 90, img: '/img/pack-mymelody.jpg' }
];

function dibujarPDF(doc, data) {
    const colorPrincipal = '#ff85a2';
    doc.fillColor('#2c2c2c').fontSize(25).font('Helvetica-Bold').text('Piko Kopi - Recibo', { align: 'center' });
    doc.fillColor(colorPrincipal).fontSize(18).text('#' + data.nro, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#333').font('Helvetica');
    doc.text(`Cliente: ${data.nombre}`);
    doc.text(`WhatsApp: ${data.celular}`);
    doc.text(`Ciudad: ${data.ciudad}`);
    doc.moveDown();
    doc.text('--------------------------------------------------');
    data.carrito.forEach(item => {
        doc.text(`${item.titulo} (${item.variante}) x${item.cantidad} -- ${ (item.precio * item.cantidad).toFixed(2) } BS`);
    });
    doc.text('--------------------------------------------------');
    doc.fontSize(14).fillColor(colorPrincipal).font('Helvetica-Bold').text(`TOTAL: ${data.total} BS`, { align: 'right' });
}

app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});

app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    
    // Crear el resumen de productos para el Excel
    const productosTexto = data.carrito.map(p => `${p.titulo} (${p.variante}) x${p.cantidad}`).join(', ');

    try {
        // 1. Intentar Google Sheets primero
        try {
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!A:G', // OJO: Asegúrate que en tu Excel diga "Sheet1"
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' }),
                        data.nombre,
                        data.celular,
                        data.ciudad,
                        'WhatsApp',
                        data.total,
                        productosTexto
                    ]]
                }
            });
            console.log("✅ Google Sheets OK");
        } catch (e) {
            console.error("❌ Error Sheets:", e.message);
        }

        // 2. Generar PDF (Configuración de flujo correcto)
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PikoKopi_${data.nro}.pdf`);

        doc.pipe(res); // El pipe debe ir antes de dibujar y terminar
        dibujarPDF(doc, data);
        doc.end();

    } catch (error) {
        console.error("Error Crítico:", error);
        if (!res.headersSent) {
            res.status(500).send("Error en el servidor");
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});