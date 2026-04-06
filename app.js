require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- GOOGLE SHEETS ---
const SPREADSHEET_ID = '1bIaOsBjsI9m-5l2uGFi48SQGEjQFtnYt8T4rH5HFElg';

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const rawKey      = process.env.GOOGLE_PRIVATE_KEY;
const privateKey  = rawKey
    ? rawKey.replace(/\\n/g, '\n').replace(/"/g, '').replace(/'/g, '').trim()
    : undefined;

console.log('--- CREDENCIALES ---');
console.log('EMAIL:', clientEmail ? '✅' : '❌');
console.log('KEY:',   privateKey  ? '✅' : '❌');

const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// --- PRODUCTOS ---
// subtipos: array de strings para mostrar selector en la card
// variantePrecio: array de {label, precio} para scoops con precio variable
const listaProductos = [
    
    { id: '1',  titulo: 'Scoop',                         cat: 'scoops',   precio: 100, img: '/img/scoop.jpg',
      variantePrecio: [
        { label: '1 Scoop', precio: 99 },
        { label: '2 Scoops', precio: 189 },
        { label: '3 Scoops', precio: 280 },
        { label: '4 Scoops', precio: 370 },
      ]},
    { id: '2', titulo: 'Cápsulas Extra',                cat: 'scoops',   precio: 30,  img: '/img/capsulas-extra.jpg',
      variantePrecio: [
        { label: '1 Cápsula', precio: 30 },
        { label: '2 Cápsulas', precio: 55 },
        { label: '3 Cápsulas', precio: 80 },
        { label: '4+ Cápsulas (c/u 25 BS)', precio: 25 },
      ]},
    { id: '3', titulo: 'Scoop + Cápsulas Combo',        cat: 'scoops',   precio: 150, img: '/img/scoop-capsulas.jpg',
      variantePrecio: [
        { label: '1 Scoop + 2 Cápsulas', precio: 150 },
        { label: '2 Scoops + 2 Cápsulas', precio: 240 },
      ]},
    // PACKS
    { id: '4', titulo: 'Pack de Snoopy',                cat: 'packs',    precio: 95,  img: '/img/pack-snoopy.jpg' },
    { id: '5', titulo: 'Pack de Cinamorroll',           cat: 'packs',    precio: 80,  img: '/img/pack-cinamorroll.jpg' },
    { id: '6', titulo: 'Pack de My Melody',             cat: 'packs',    precio: 90,  img: '/img/pack-mymelody.jpg' },
    // PRODUCTOS
    { id: '20',  titulo: 'Notas Cabeza Snoopy',           cat: 'productos', precio: 13,  img: '/img/notas-snoopy.jpg',
      subtipos: ['Rojo','Azul','Verde','Amarillo'] },
    { id: '21',  titulo: 'Binder Sanrio',                 cat: 'productos', precio: 35,  img: '/img/binder-sanrio.jpg',
      subtipos: ['Cinamorroll','Hello Kitty','Pompompurin','Pochacco','Kuromi'] },
    { id: '22',  titulo: 'Sticker Black and White Style', cat: 'productos', precio: 8,   img: '/img/sticker-bw.jpg' },
    { id: '23',  titulo: 'Figuras de Yeso Sanrio',        cat: 'productos', precio: 5,   img: '/img/figuras-yeso.jpg' },
    { id: '24',  titulo: 'Sellos en Tira',                cat: 'productos', precio: 20,  img: '/img/sellos-tira.jpg',
      subtipos: ['Morado','Turquesa','Rosado','Azul'] },
    { id: '25',  titulo: 'Llaveros Snoopy Goma',          cat: 'productos', precio: 8,   img: '/img/llaveros-snoopy.jpg',
      subtipos: ['Piloto','Mujer','Normal','Sombrero'] },
    { id: '26',  titulo: 'Bolígrafo Hello Kitty',         cat: 'productos', precio: 5,   img: '/img/boligrafo-hellokitty.jpg',
      subtipos: ['Rojo','Rosa','Blanco'] },
    { id: '27',  titulo: 'Binder Hello Kitty JEAN',       cat: 'productos', precio: 40,  img: '/img/binder-hellokitty-jean.jpg' },
    // SCOOPS — precio variable según cantidad
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTADOR GLOBAL — usa un número en memoria del proceso + respaldo en Sheets
// El contador en memoria es la fuente de verdad mientras el proceso esté vivo.
// Al arrancar el servidor, lee cuántas filas tiene Sheet1 para sincronizar.
// Mutex simple para evitar condición de carrera entre pedidos simultáneos.
// ─────────────────────────────────────────────────────────────────────────────
let contadorGlobal = null;   // null = aún no inicializado
let mutexLocked    = false;
const mutexQueue   = [];

function adquirirMutex() {
    return new Promise(resolve => {
        if (!mutexLocked) { mutexLocked = true; resolve(); }
        else { mutexQueue.push(resolve); }
    });
}

function liberarMutex() {
    if (mutexQueue.length > 0) { mutexQueue.shift()(); }
    else { mutexLocked = false; }
}

// Inicializar leyendo las filas actuales de Sheet1 (se llama una vez al arrancar)
async function inicializarContador() {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:A',
        });
        const filas = (res.data.values || []).length;
        contadorGlobal = filas; // cada fila = un pedido ya guardado
        console.log(`✅ Contador inicializado en ${contadorGlobal}`);
    } catch (err) {
        console.error('⚠️  No se pudo leer Sheets para inicializar contador:', err.message);
        contadorGlobal = 0; // fallback seguro
    }
}

// Devuelve el siguiente número formateado como "0001"
async function siguienteNumeroPedido() {
    await adquirirMutex();
    try {
        if (contadorGlobal === null) await inicializarContador();
        contadorGlobal += 1;
        return String(contadorGlobal).padStart(4, '0');
    } finally {
        liberarMutex();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTA: GET /nuevo-numero  — el frontend llama esto antes de confirmar pedido
// ─────────────────────────────────────────────────────────────────────────────
app.get('/nuevo-numero', async (req, res) => {
    try {
        const nro = await siguienteNumeroPedido();
        console.log('🔢 Número asignado:', nro);
        res.json({ nro });
    } catch (err) {
        console.error('❌ Error /nuevo-numero:', err.message);
        res.status(500).json({ error: 'No se pudo generar número de pedido' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PDF
// ─────────────────────────────────────────────────────────────────────────────
function dibujarPDF(doc, data) {
    const colorPrincipal = '#ff85a2';
    const colorOscuro    = '#2c2c2c';
    const colorGris      = '#666666';
    const colorGrisClaro = '#999999';
    const colorLinea     = '#e8e8e8';
    const colorFondo     = '#fafafa';
    const margin         = 30;
    const pageWidth      = doc.page.width;
    const contentWidth   = pageWidth - 2 * margin;

    doc.fillColor(colorOscuro).fontSize(36).font('Helvetica-Bold');
    doc.text('Recibo', margin, 30, { align: 'center', width: contentWidth });

    doc.fillColor(colorPrincipal).fontSize(24).font('Helvetica-Bold');
    doc.text('#' + data.nro, margin, 75, { align: 'center', width: contentWidth });
    doc.moveDown(1);

    const boxY      = doc.y + 10;
    const boxHeight = 110;
    doc.rect(margin, boxY, contentWidth, boxHeight).fill(colorFondo);
    doc.rect(margin, boxY, contentWidth, boxHeight).stroke({ color: colorLinea, width: 1.5 });

    doc.fillColor(colorGrisClaro).fontSize(7).font('Helvetica-Bold');
    doc.text('INFORMACION DEL PEDIDO', margin + 12, boxY + 8, { width: contentWidth - 24 });
    doc.fontSize(9).font('Helvetica').fillColor(colorOscuro);
    doc.text(data.nombre, margin + 12, boxY + 22, { width: contentWidth - 24 });
    doc.fontSize(8).fillColor(colorGris);
    doc.text('Tel: '    + data.celular, margin + 12, boxY + 39, { width: contentWidth - 24 });
    doc.text('Ciudad: ' + data.ciudad,  margin + 12, boxY + 54, { width: contentWidth - 24 });
    if (data.envio) doc.text('Envío: ' + data.envio, margin + 12, boxY + 69, { width: contentWidth - 24 });

    const fecha = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    doc.fontSize(7).fillColor(colorGrisClaro);
    doc.text(fecha + ' a las ' + hora, margin + 12, boxY + 84, { width: contentWidth - 24 });
    doc.y = boxY + boxHeight + 15;

    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1 });
    doc.moveDown(1);

    const headerY = doc.y;
    doc.rect(margin, headerY - 2, contentWidth, 15).fill(colorFondo);
    doc.rect(margin, headerY - 2, contentWidth, 15).stroke({ color: colorLinea, width: 1 });
    doc.fillColor(colorOscuro).fontSize(7).font('Helvetica-Bold');
    doc.text('Producto', margin + 8,                   headerY + 2, { width: contentWidth * 0.60 });
    doc.text('Cant.',    margin + contentWidth * 0.63, headerY + 2, { width: 40 });
    doc.text('Total',    pageWidth - margin - 45,      headerY + 2, { width: 40, align: 'right' });
    doc.moveDown(1.5);

    data.carrito.forEach((item, index) => {
        const itemY = doc.y;
        doc.fillColor(colorOscuro).fontSize(8).font('Helvetica');
        doc.text(item.titulo, margin + 8, itemY, { width: contentWidth * 0.60 });
        doc.fillColor(colorGris).fontSize(8);
        doc.text('x' + item.cantidad, margin + contentWidth * 0.63, itemY, { width: 40 });
        doc.text((item.precio * item.cantidad).toFixed(2) + ' BS', pageWidth - margin - 45, itemY, { width: 40, align: 'right' });
        doc.moveDown(1.3);
        if (index < data.carrito.length - 1) {
            doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: '#f5f5f5', width: 0.5 });
            doc.moveDown(0.4);
        }
    });

    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1.5 });
    doc.moveDown(1);

    // Subtotal + descuento si aplica
    if (data.descuento && parseFloat(data.descuentoMonto) > 0) {
        const subY = doc.y;
        doc.fillColor(colorGris).fontSize(8).font('Helvetica');
        doc.text('Subtotal', margin + 8, subY, { width: contentWidth * 0.60 });
        doc.text(data.subtotal + ' BS', pageWidth - margin - 45, subY, { width: 40, align: 'right' });
        doc.moveDown(1.1);

        const descY = doc.y;
        doc.fillColor('#2d7a4f').fontSize(8).font('Helvetica-Bold');
        doc.text('Descuento (' + data.descuento + ')', margin + 8, descY, { width: contentWidth * 0.60 });
        doc.text('−' + data.descuentoMonto + ' BS', pageWidth - margin - 45, descY, { width: 40, align: 'right' });
        doc.moveDown(1.1);

        doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 0.5 });
        doc.moveDown(0.8);
    }

    const totalY = doc.y;
    doc.fillColor(colorOscuro).fontSize(9).font('Helvetica');
    doc.text('Total a pagar', margin + 8, totalY, { width: contentWidth * 0.60 });
    doc.fillColor(colorPrincipal).fontSize(16).font('Helvetica-Bold');
    doc.text(data.total + ' BS', pageWidth - margin - 50, totalY, { width: 50, align: 'right' });

    doc.moveDown(1.5);

    // Nota costo de envío
    doc.fillColor(colorGrisClaro).fontSize(6.5).font('Helvetica');
    const notaEnvio = data.pagoEnvio
        ? '⚠ Costo de envío (' + data.pagoEnvio + ') no incluido — se coordina por WhatsApp'
        : '⚠ Costo de envío no incluido en este recibo — se coordina por WhatsApp';
    doc.text(notaEnvio, margin, doc.y, { align: 'center', width: contentWidth });

    doc.moveDown(1.2);
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 0.5 });
    doc.moveDown(1);
    doc.fillColor(colorPrincipal).fontSize(9).font('Helvetica');
    doc.text('Gracias por elegir Piko Kopi', margin, doc.y, { align: 'center', width: contentWidth });
    doc.moveDown(0.8);
    doc.fontSize(6).fillColor(colorGrisClaro);
    doc.text('Envía este recibo por WhatsApp para completar tu pedido', margin, doc.y, { align: 'center', width: contentWidth });
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PRINCIPALES
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});

app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;

    // Validar que venga un número real (no undefined, no vacío)
    if (!data.nro || data.nro === 'undefined') {
        console.error('❌ Pedido recibido sin número válido:', data.nro);
        return res.status(400).send('Número de pedido inválido');
    }

    console.log('📦 Procesando pedido:', data.nro);

    try {
        const productosResumen = data.carrito.map(p => `${p.titulo} x${p.cantidad}`).join(' | ');

        // Guardar en Sheets
        try {
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!A:H',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' }),
                        data.nombre,
                        data.celular,
                        data.ciudad,
                        data.envio || 'Sin especificar',
                        data.pagoEnvio || 'N/A',
                        data.descuento || 'Sin descuento',
                        data.descuentoMonto || '0',
                        data.total,
                        productosResumen,
                        '#' + data.nro,
                    ]],
                },
            });
            console.log('✅ Guardado en Sheets como #' + data.nro);
        } catch (sheetErr) {
            console.error('⚠️  Error Sheets:', sheetErr.message);
        }

        // Generar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Recibo_${data.nro}.pdf`);
        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        doc.pipe(res);
        dibujarPDF(doc, data);
        doc.end();

    } catch (error) {
        console.error('❌ Error general:', error);
        if (!res.headersSent) res.status(500).send('Error al procesar');
    }
});

// Inicializar contador al arrancar y luego escuchar
inicializarContador().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Piko Kopi en puerto ${PORT}`);
    });
});