require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE GOOGLE SHEETS ---
const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg';

// Limpieza profunda de la Private Key para entornos Linux (Render)
const privateKey = process.env.GOOGLE_PRIVATE_KEY 
    ? process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n') 
    : undefined;

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// --- BASE DE DATOS EN MEMORIA ---
let pedidosGuardados = [];

// 🎨 FUNCIÓN: DISEÑO DEL RECIBO (Optimizada)
function dibujarPDF(doc, data) {
    const margin = 30;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 2 * margin;

    const colorPrincipal = '#ff85a2';
    const colorOscuro = '#2c2c2c';
    const colorGris = '#666666';
    const colorGrisClaro = '#999999';
    const colorLinea = '#e8e8e8';
    const colorFondo = '#fafafa';

    // Cabecera
    doc.fillColor(colorOscuro).fontSize(36).font('Helvetica-Bold');
    doc.text('Recibo', margin, 30, { align: 'center', width: contentWidth });
    doc.fillColor(colorPrincipal).fontSize(24).font('Helvetica-Bold');
    doc.text('#' + data.nro, margin, 75, { align: 'center', width: contentWidth });

    doc.moveDown(1);
    const boxY = doc.y + 10;
    const boxHeight = 95;

    doc.rect(margin, boxY, contentWidth, boxHeight).fill(colorFondo);
    doc.rect(margin, boxY, contentWidth, boxHeight).stroke({ color: colorLinea, width: 1.5 });

    doc.fillColor(colorGrisClaro).fontSize(7).font('Helvetica-Bold');
    doc.text('INFORMACIÓN DEL PEDIDO', margin + 12, boxY + 8);

    doc.fontSize(9).font('Helvetica').fillColor(colorOscuro);
    doc.text(data.nombre || 'Cliente', margin + 12, boxY + 22);
    doc.fontSize(8).fillColor(colorGris);
    doc.text('Tel: ' + (data.celular || 'S/N'), margin + 12, boxY + 39);
    doc.text('Ciudad: ' + (data.ciudad || 'S/N'), margin + 12, boxY + 54);

    const ahora = new Date().toLocaleString('es-BO');
    doc.fontSize(7).fillColor(colorGrisClaro);
    doc.text(ahora, margin + 12, boxY + 69);

    doc.y = boxY + boxHeight + 20;

    // Tabla de productos
    const headerY = doc.y;
    doc.rect(margin, headerY - 2, contentWidth, 15).fill(colorFondo).stroke(colorLinea);
    doc.fillColor(colorOscuro).fontSize(7).font('Helvetica-Bold');
    doc.text('Producto', margin + 8, headerY + 2);
    doc.text('Cant.', margin + contentWidth * 0.65, headerY + 2);
    doc.text('Total', pageWidth - margin - 45, headerY + 2, { align: 'right' });

    doc.moveDown(1.5);

    if (data.carrito && Array.isArray(data.carrito)) {
        data.carrito.forEach((item) => {
            const itemY = doc.y;
            doc.fillColor(colorOscuro).fontSize(8).font('Helvetica');
            doc.text(item.titulo, margin + 8, itemY, { width: contentWidth * 0.60 });
            doc.text('x' + item.cantidad, margin + contentWidth * 0.65, itemY);
            doc.text(item.subtotal.toFixed(2) + ' BS', pageWidth - margin - 45, itemY, { align: 'right' });
            doc.moveDown(1.2);
        });
    }

    doc.moveDown(1);
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke(colorLinea);
    doc.moveDown(1);

    doc.fillColor(colorPrincipal).fontSize(16).font('Helvetica-Bold');
    doc.text('TOTAL: ' + (data.total || 0) + ' BS', margin, doc.y, { align: 'right', width: contentWidth - 8 });
}

// --- RUTAS ---

// --- LISTA DE PRODUCTOS ---
const listaProductos = [
    // CATEGORÍA: PRODUCTOS
    {
        id: '1',
        titulo: 'Notas Cabeza Snoopy',
        cat: 'productos',
        precio: 12,
        img: '/img/notas-snoopy.jpg',
        variantes: [
            { nombre: 'Rojo', precio: 12 },
            { nombre: 'Azul', precio: 12 },
            { nombre: 'Verde', precio: 12 },
            { nombre: 'Amarillo', precio: 12 }
        ]
    },
    {
        id: '2',
        titulo: 'Binder Sanrio',
        cat: 'productos',
        precio: 26,
        img: '/img/binder-sanrio.jpg',
        variantes: [
            { nombre: 'Cinamorroll', precio: 26 },
            { nombre: 'Hello Kitty', precio: 26 },
            { nombre: 'Pompompurin', precio: 26 },
            { nombre: 'Pochacco', precio: 26 },
            { nombre: 'Kuromi', precio: 26 }
        ]
    },
    {
        id: '3',
        titulo: 'Sticker Black and White Style',
        cat: 'productos',
        precio: 8,
        img: '/img/sticker-bw.jpg'
    },
    {
        id: '4',
        titulo: 'Figuras de Yeso Sanrio',
        cat: 'productos',
        precio: 5,
        img: '/img/figuras-yeso.jpg'
    },
    {
        id: '5',
        titulo: 'Sellos en Tira',
        cat: 'productos',
        precio: 15,
        img: '/img/sellos-tira.jpg',
        variantes: [
            { nombre: 'Morado', precio: 15 },
            { nombre: 'Turquesa', precio: 15 },
            { nombre: 'Rosado', precio: 15 },
            { nombre: 'Azul', precio: 15 }
        ]
    },
    {
        id: '6',
        titulo: 'Llaveros Snoopy Goma',
        cat: 'productos',
        precio: 7,
        img: '/img/llaveros-snoopy.jpg',
        variantes: [
            { nombre: 'Piloto', precio: 7 },
            { nombre: 'Mujer', precio: 7 },
            { nombre: 'Normal', precio: 7 },
            { nombre: 'Sombrero', precio: 7 }
        ]
    },
    {
        id: '7',
        titulo: 'Boligrafo Hello Kitty',
        cat: 'productos',
        precio: 5,
        img: '/img/boligrafo-hellokitty.jpg',
        variantes: [
            { nombre: 'Rojo', precio: 5 },
            { nombre: 'Rosa', precio: 5 },
            { nombre: 'Blanco', precio: 5 }
        ]
    },
    {
        id: '8',
        titulo: 'Binder Hello Kitty JEAN',
        cat: 'productos',
        precio: 40,
        img: '/img/binder-hellokitty-jean.jpg'
    },

    // CATEGORÍA: SCOOPS
    {
        id: '9',
        titulo: 'Scoop Simple',
        cat: 'scoops',
        precio: 100,
        img: '/img/scoop.jpg',
        variantes: [
            { nombre: '1 Scoop (100 BS)', precio: 100 },
            { nombre: '2 Scoop (190 BS)', precio: 190 },
            { nombre: '3 Scoop (280 BS)', precio: 280 },
            { nombre: '4 Scoop (370 BS)', precio: 370 }
        ]
    },
    {
        id: '10',
        titulo: 'Capsulas Extra',
        cat: 'scoops',
        precio: 30,
        img: '/img/capsulas-extra.jpg',
        variantes: [
            { nombre: '1 Capsula Extra (30 BS)', precio: 30 },
            { nombre: '2 Capsulas Extra (55 BS)', precio: 55 },
            { nombre: '3 Capsulas Extra (80 BS)', precio: 80 }
        ]
    },
    {
        id: '11',
        titulo: 'Scoop + Capsulas Combo',
        cat: 'scoops',
        precio: 150,
        img: '/img/scoop-capsulas.jpg',
        variantes: [
            { nombre: '1 Scoop + 2 Capsulas (150 BS)', precio: 150 },
            { nombre: '2 Scoop + 2 Capsulas (240 BS)', precio: 240 }
        ]
    },

    // CATEGORÍA: PACKS
    {
        id: '12',
        titulo: 'Pack de Snoopy',
        cat: 'packs',
        precio: 80,
        img: '/img/pack-snoopy.jpg'
    },
    {
        id: '13',
        titulo: 'Pack de Cinamorroll',
        cat: 'packs',
        precio: 80,
        img: '/img/pack-cinamorroll.jpg'
    },
    {
        id: '14',
        titulo: 'Pack de My Melody',
        cat: 'packs',
        precio: 90,
        img: '/img/pack-mymelody.jpg'
    }
];

// --- RUTA 1: VER LA TIENDA ---
app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});
app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    console.log("Recibiendo pedido Nro:", data.nro);

    try {
        // 1. Guardar en memoria local (temporal mientras el server no se reinicie)
        pedidosGuardados.push({
            ...data,
            fechaRegistro: new Date().toLocaleString('es-BO')
        });

        // 2. Intentar guardar en Google Sheets
        try {
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!A:G',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('es-BO'), 
                        data.nombre, 
                        data.celular, 
                        data.ciudad, 
                        data.transporte || 'No especificado', 
                        data.total, 
                        data.productosTexto || 'Sin detalle'
                    ]]
                }
            });
            console.log("✅ Google Sheets actualizado");
        } catch (sheetError) {
            console.error("❌ Error en Google Sheets:", sheetError.message);
            // No bloqueamos la respuesta, seguimos para dar el PDF
        }

        // 3. Generar PDF y enviarlo al cliente
        const nombreArchivo = `Recibo_#${data.nro}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        doc.pipe(res);
        dibujarPDF(doc, data);
        doc.end();

    } catch (error) {
        console.error("❌ Error crítico en /confirmar-pedido:", error);
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
});

app.get('/descargar-recibo/:nro', (req, res) => {
    const pedido = pedidosGuardados.find(p => p.nro == req.params.nro);
    if (!pedido) return res.status(404).send("Pedido no encontrado");

    res.setHeader('Content-Type', 'application/pdf');
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    doc.pipe(res);
    dibujarPDF(doc, pedido);
    doc.end();
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Piko Kopi Online: Puerto ${PORT}`);
});