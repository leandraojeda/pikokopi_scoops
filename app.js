require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas estáticas para CSS e Imágenes
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- CONFIGURACIÓN DE GOOGLE SHEETS ---
const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg';

// TRUCO PARA RENDER: Convierte los \n de texto en saltos de línea reales
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

// --- LISTA DE PRODUCTOS ---
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

let pedidosGuardados = [];

// --- FUNCIÓN DISEÑO PDF ---
function dibujarPDF(doc, data) {
    const margin = 30;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 2 * margin;
    const colorPrincipal = '#ff85a2';
    
    doc.fillColor('#2c2c2c').fontSize(30).font('Helvetica-Bold').text('Recibo Piko Kopi', { align: 'center' });
    doc.fillColor(colorPrincipal).fontSize(20).text('#' + data.nro, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#000').font('Helvetica').text(`Cliente: ${data.nombre}`);
    doc.text(`Celular: ${data.celular}`);
    doc.text(`Ciudad: ${data.ciudad}`);
    doc.moveDown();
    doc.text('-------------------------------------------');
    
    if (data.carrito && Array.isArray(data.carrito)) {
        data.carrito.forEach(item => {
            doc.text(`${item.titulo} x${item.cantidad} - ${item.subtotal.toFixed(2)} BS`);
        });
    }
    
    doc.text('-------------------------------------------');
    doc.fontSize(14).fillColor(colorPrincipal).font('Helvetica-Bold').text(`TOTAL: ${data.total} BS`, { align: 'right' });
}

// --- RUTAS ---

app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});

app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    console.log("Procesando pedido:", data.nro);

    try {
        // 1. Guardar en memoria
        pedidosGuardados.push({ ...data, fecha: new Date().toLocaleString('es-BO') });

        // 2. Intentar guardar en Google Sheets
        try {
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!A:G', // ASEGÚRATE QUE TU HOJA SE LLAME Sheet1
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('es-BO'), 
                        data.nombre, 
                        data.celular, 
                        data.ciudad, 
                        data.transporte || 'S/N', 
                        data.total, 
                        data.productosTexto || 'Sin detalle'
                    ]]
                }
            });
            console.log("✅ Datos enviados a Google Sheets");
        } catch (sheetError) {
            console.error("❌ Error en Google Sheets:", sheetError.message);
            // El proceso sigue para no dejar al cliente sin su PDF
        }

        // 3. Generar y enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Recibo_${data.nro}.pdf`);
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        doc.pipe(res);
        dibujarPDF(doc, data);
        doc.end();

    } catch (error) {
        console.error("❌ Error general:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Piko Kopi activo en puerto ${PORT}`);
});