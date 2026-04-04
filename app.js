require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN DE EXPRESS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE IDs ---
const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg';

// --- BASE DE DATOS EN MEMORIA (para guardar pedidos) ---
let pedidosGuardados = [];

// --- AUTENTICACIÓN GOOGLE ---
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 🎨 FUNCIÓN: DISEÑO DEL RECIBO PIKO KOPI - MINIMALISTA
function dibujarPDF(doc, data) {
    const margin = 30;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 2 * margin;

    // Colores
    const colorPrincipal = '#ff85a2';   // Rosa Piko
    const colorOscuro = '#2c2c2c';      // Gris oscuro
    const colorGris = '#666666';        // Gris medio
    const colorGrisClaro = '#999999';   // Gris claro
    const colorLinea = '#e8e8e8';       // Línea gris suave
    const colorFondo = '#fafafa';       // Fondo muy claro

    // ===== TÍTULO: RECIBO =====
    doc.fillColor(colorOscuro).fontSize(36).font('Helvetica-Bold');
    doc.text('Recibo', margin, 30, { align: 'center', width: contentWidth });

    // ===== NÚMERO DE PEDIDO =====
    doc.fillColor(colorPrincipal).fontSize(24).font('Helvetica-Bold');
    doc.text('#' + data.nro, margin, 75, { align: 'center', width: contentWidth });

    doc.moveDown(1);

    // ===== CUADRO CON DATOS DEL CLIENTE =====
    const boxY = doc.y + 10;
    const boxHeight = 95;

    // Fondo del cuadro
    doc.rect(margin, boxY, contentWidth, boxHeight).fill(colorFondo);
    // Borde del cuadro
    doc.rect(margin, boxY, contentWidth, boxHeight).stroke({ color: colorLinea, width: 1.5 });

    // Título dentro del cuadro
    doc.fillColor(colorGrisClaro).fontSize(7).font('Helvetica-Bold');
    doc.text('INFORMACION DEL PEDIDO', margin + 12, boxY + 8, { width: contentWidth - 24 });

    // Datos del cliente
    doc.fontSize(9).font('Helvetica').fillColor(colorOscuro);
    doc.text(data.nombre, margin + 12, boxY + 22, { width: contentWidth - 24 });

    doc.fontSize(8).fillColor(colorGris);
    doc.text('Tel: ' + data.celular, margin + 12, boxY + 39, { width: contentWidth - 24 });
    doc.text('Ciudad: ' + data.ciudad, margin + 12, boxY + 54, { width: contentWidth - 24 });

    const fecha = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    doc.fontSize(7).fillColor(colorGrisClaro);
    doc.text(fecha + ' a las ' + hora, margin + 12, boxY + 69, { width: contentWidth - 24 });

    doc.y = boxY + boxHeight + 15;

    // ===== LÍNEA SEPARADORA =====
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1 });
    doc.moveDown(1);

    // ===== TABLA DE PRODUCTOS =====
    // Encabezados con fondo
    const headerY = doc.y;
    doc.rect(margin, headerY - 2, contentWidth, 15).fill(colorFondo);
    doc.rect(margin, headerY - 2, contentWidth, 15).stroke({ color: colorLinea, width: 1 });

    doc.fillColor(colorOscuro).fontSize(7).font('Helvetica-Bold');
    doc.text('Producto', margin + 8, headerY + 2, { width: contentWidth * 0.60 });
    doc.text('Cant.', margin + contentWidth * 0.63, headerY + 2, { width: 40 });
    doc.text('Total', pageWidth - margin - 45, headerY + 2, { width: 40, align: 'right' });

    doc.moveDown(1.5);

    // Productos
    let productoNum = 0;
    data.carrito.forEach((item, index) => {
        const itemY = doc.y;
        productoNum++;

        // Nombre del producto
        doc.fillColor(colorOscuro).fontSize(8).font('Helvetica');
        doc.text(item.titulo, margin + 8, itemY, { width: contentWidth * 0.60 });

        // Variante (si existe)
        if (item.variante) {
            doc.fillColor(colorGris).fontSize(7).font('Helvetica');
            doc.text(item.variante, margin + 8, itemY + 10, { width: contentWidth * 0.60 });
        }

        // Cantidad
        doc.fillColor(colorGris).fontSize(8).font('Helvetica');
        doc.text('x' + item.cantidad, margin + contentWidth * 0.63, itemY, { width: 40 });

        // Subtotal
        doc.text(item.subtotal.toFixed(2) + ' BS', pageWidth - margin - 45, itemY, { width: 40, align: 'right' });

        doc.moveDown(1.3);

        // Línea separadora entre productos
        if (index < data.carrito.length - 1) {
            doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: '#f5f5f5', width: 0.5 });
            doc.moveDown(0.4);
        }
    });

    // ===== LÍNEA SEPARADORA FINAL =====
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1.5 });
    doc.moveDown(1);

    // ===== TOTAL FINAL =====
    const totalY = doc.y;
    doc.fillColor(colorOscuro).fontSize(9).font('Helvetica');
    doc.text('Total a pagar', margin + 8, totalY, { width: contentWidth * 0.60 });

    doc.fillColor(colorPrincipal).fontSize(16).font('Helvetica-Bold');
    doc.text(data.total + ' BS', pageWidth - margin - 50, totalY, { width: 50, align: 'right' });

    doc.moveDown(2.2);

    // ===== MENSAJE DE CIERRE =====
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 0.5 });
    doc.moveDown(1);

    doc.fillColor(colorPrincipal).fontSize(9).font('Helvetica');
    doc.text('Gracias por elegir Piko Kopi', margin, doc.y, { align: 'center', width: contentWidth });

    doc.moveDown(0.8);
    doc.fontSize(6).fillColor(colorGrisClaro).font('Helvetica');
    doc.text('Envia este recibo por WhatsApp para completar tu pedido', margin, doc.y, { align: 'center', width: contentWidth });
}

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

// --- RUTA 2: VER PÁGINA DE PEDIDOS ---
app.get('/pedidos', (req, res) => {
    res.render('pedidos', { pedidos: pedidosGuardados });
});

// --- RUTA 3: PROCESAR PEDIDO (GENERAR PDF Y GUARDAR) ---
app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    const nombreArchivo = `Recibo_#${data.nro}_${data.nombre.replace(/\s+/g, '_')}.pdf`;

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Guardar pedido en memoria
        pedidosGuardados.push({
            nro: data.nro,
            nombre: data.nombre,
            celular: data.celular,
            ciudad: data.ciudad,
            fecha: new Date().toLocaleString('es-BO'),
            total: data.total,
            carrito: data.carrito
        });

        // 2. Registrar en Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[new Date().toLocaleString('es-BO'), data.nombre, data.celular, data.ciudad, data.transporte, data.total, data.productosTexto]]
            }
        });

        // 3. Enviar PDF al cliente para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

        const docCliente = new PDFDocument({ size: 'A5', margin: 40 });
        docCliente.pipe(res);
        dibujarPDF(docCliente, data);
        docCliente.end();

    } catch (error) {
        console.error("Error en el proceso:", error);
        res.status(500).send("Error al procesar el pedido.");
    }
});

// --- RUTA 4: DESCARGAR RECIBO NUEVAMENTE ---
app.get('/descargar-recibo/:nro', (req, res) => {
    const { nro } = req.params;
    
    // Buscar el pedido
    const pedido = pedidosGuardados.find(p => p.nro === nro);
    
    if (!pedido) {
        return res.status(404).send("Pedido no encontrado");
    }

    const nombreArchivo = `Recibo_#${nro}_${pedido.nombre.replace(/\s+/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    const docCliente = new PDFDocument({ size: 'A5', margin: 40 });
    docCliente.pipe(res);
    dibujarPDF(docCliente, pedido);
    docCliente.end();
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Piko Kopi funcionando en puerto ${PORT}`);
});