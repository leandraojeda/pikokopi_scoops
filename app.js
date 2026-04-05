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

// Celda dedicada al contador global de pedidos (Sheet2!A1 o donde prefieras)
// Si no existe esa hoja, créala manualmente en tu Spreadsheet con el valor 0 en A1.
const CONTADOR_RANGE = 'Contador!A1';

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
const listaProductos = [
    { id: '1',  titulo: 'Notas Cabeza Snoopy',          cat: 'productos', precio: 12,  img: '/img/notas-snoopy.jpg' },
    { id: '2',  titulo: 'Binder Sanrio',                cat: 'productos', precio: 26,  img: '/img/binder-sanrio.jpg' },
    { id: '3',  titulo: 'Sticker Black and White Style', cat: 'productos', precio: 8,   img: '/img/sticker-bw.jpg' },
    { id: '4',  titulo: 'Figuras de Yeso Sanrio',       cat: 'productos', precio: 5,   img: '/img/figuras-yeso.jpg' },
    { id: '5',  titulo: 'Sellos en Tira',               cat: 'productos', precio: 15,  img: '/img/sellos-tira.jpg' },
    { id: '6',  titulo: 'Llaveros Snoopy Goma',         cat: 'productos', precio: 7,   img: '/img/llaveros-snoopy.jpg' },
    { id: '7',  titulo: 'Boligrafo Hello Kitty',        cat: 'productos', precio: 5,   img: '/img/boligrafo-hellokitty.jpg' },
    { id: '8',  titulo: 'Binder Hello Kitty JEAN',      cat: 'productos', precio: 40,  img: '/img/binder-hellokitty-jean.jpg' },
    { id: '9',  titulo: 'Scoop Simple',                 cat: 'scoops',   precio: 100, img: '/img/scoop.jpg' },
    { id: '10', titulo: 'Capsulas Extra',               cat: 'scoops',   precio: 30,  img: '/img/capsulas-extra.jpg' },
    { id: '11', titulo: 'Scoop + Capsulas Combo',       cat: 'scoops',   precio: 150, img: '/img/scoop-capsulas.jpg' },
    { id: '12', titulo: 'Pack de Snoopy',               cat: 'packs',    precio: 80,  img: '/img/pack-snoopy.jpg' },
    { id: '13', titulo: 'Pack de Cinamorroll',          cat: 'packs',    precio: 80,  img: '/img/pack-cinamorroll.jpg' },
    { id: '14', titulo: 'Pack de My Melody',            cat: 'packs',    precio: 90,  img: '/img/pack-mymelody.jpg' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTADOR GLOBAL — lee y escribe en Contador!A1 del Spreadsheet
// Para evitar condiciones de carrera usamos un mutex simple en memoria.
// ─────────────────────────────────────────────────────────────────────────────
let contadorBloqueado = false;
const colaContador = [];

async function obtenerSiguienteNumero() {
    return new Promise((resolve, reject) => {
        colaContador.push({ resolve, reject });
        procesarColaContador();
    });
}

async function procesarColaContador() {
    if (contadorBloqueado || colaContador.length === 0) return;
    contadorBloqueado = true;
    const { resolve, reject } = colaContador.shift();

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Leer el valor actual
        const getRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: CONTADOR_RANGE,
        });

        const valorActual = parseInt((getRes.data.values?.[0]?.[0]) || '0', 10);
        const nuevoValor  = valorActual + 1;

        // Escribir el nuevo valor
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: CONTADOR_RANGE,
            valueInputOption: 'RAW',
            requestBody: { values: [[nuevoValor]] },
        });

        // Formatear como 0001, 0002, …
        resolve(String(nuevoValor).padStart(4, '0'));
    } catch (err) {
        reject(err);
    } finally {
        contadorBloqueado = false;
        // Procesar siguiente en cola
        setTimeout(procesarColaContador, 0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTA: GET /nuevo-numero
// El frontend llama a esto ANTES de confirmar el pedido para obtener el número
// global y único, generado server-side.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/nuevo-numero', async (req, res) => {
    try {
        const nro = await obtenerSiguienteNumero();
        res.json({ nro });
    } catch (err) {
        console.error('❌ Error al obtener número:', err.message);
        res.status(500).json({ error: 'No se pudo generar el número de pedido' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PDF
// ─────────────────────────────────────────────────────────────────────────────
function dibujarPDF(doc, data) {
    const colorPrincipal  = '#ff85a2';
    const colorOscuro     = '#2c2c2c';
    const colorGris       = '#666666';
    const colorGrisClaro  = '#999999';
    const colorLinea      = '#e8e8e8';
    const colorFondo      = '#fafafa';
    const margin          = 30;
    const pageWidth       = doc.page.width;
    const contentWidth    = pageWidth - 2 * margin;

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
    doc.text('Tel: '     + data.celular, margin + 12, boxY + 39, { width: contentWidth - 24 });
    doc.text('Ciudad: '  + data.ciudad,  margin + 12, boxY + 54, { width: contentWidth - 24 });
    if (data.envio) {
        doc.text('Envío: ' + data.envio, margin + 12, boxY + 69, { width: contentWidth - 24 });
    }

    const fecha = new Date().toLocaleDateString('es-BO',  { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = new Date().toLocaleTimeString('es-BO',  { hour: '2-digit', minute: '2-digit' });
    doc.fontSize(7).fillColor(colorGrisClaro);
    doc.text(fecha + ' a las ' + hora, margin + 12, boxY + 84, { width: contentWidth - 24 });

    doc.y = boxY + boxHeight + 15;

    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1 });
    doc.moveDown(1);

    const headerY = doc.y;
    doc.rect(margin, headerY - 2, contentWidth, 15).fill(colorFondo);
    doc.rect(margin, headerY - 2, contentWidth, 15).stroke({ color: colorLinea, width: 1 });

    doc.fillColor(colorOscuro).fontSize(7).font('Helvetica-Bold');
    doc.text('Producto',  margin + 8,                         headerY + 2, { width: contentWidth * 0.60 });
    doc.text('Cant.',     margin + contentWidth * 0.63,       headerY + 2, { width: 40 });
    doc.text('Total',     pageWidth - margin - 45,            headerY + 2, { width: 40, align: 'right' });

    doc.moveDown(1.5);

    data.carrito.forEach((item, index) => {
        const itemY = doc.y;
        doc.fillColor(colorOscuro).fontSize(8).font('Helvetica');
        doc.text(item.titulo, margin + 8, itemY, { width: contentWidth * 0.60 });

        doc.fillColor(colorGris).fontSize(8).font('Helvetica');
        doc.text('x' + item.cantidad,                    margin + contentWidth * 0.63, itemY, { width: 40 });
        doc.text((item.precio * item.cantidad).toFixed(2) + ' BS', pageWidth - margin - 45, itemY, { width: 40, align: 'right' });

        doc.moveDown(1.3);

        if (index < data.carrito.length - 1) {
            doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: '#f5f5f5', width: 0.5 });
            doc.moveDown(0.4);
        }
    });

    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 1.5 });
    doc.moveDown(1);

    const totalY = doc.y;
    doc.fillColor(colorOscuro).fontSize(9).font('Helvetica');
    doc.text('Total a pagar', margin + 8, totalY, { width: contentWidth * 0.60 });
    doc.fillColor(colorPrincipal).fontSize(16).font('Helvetica-Bold');
    doc.text(data.total + ' BS', pageWidth - margin - 50, totalY, { width: 50, align: 'right' });

    doc.moveDown(2.2);
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke({ color: colorLinea, width: 0.5 });
    doc.moveDown(1);
    doc.fillColor(colorPrincipal).fontSize(9).font('Helvetica');
    doc.text('Gracias por elegir Piko Kopi', margin, doc.y, { align: 'center', width: contentWidth });
    doc.moveDown(0.8);
    doc.fontSize(6).fillColor(colorGrisClaro).font('Helvetica');
    doc.text('Envía este recibo por WhatsApp para completar tu pedido', margin, doc.y, { align: 'center', width: contentWidth });
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});

app.post('/confirmar-pedido', async (req, res) => {
    const data = req.body;
    console.log('📦 Procesando pedido:', data.nro);

    try {
        const productosResumen = data.carrito.map(p => `${p.titulo} x${p.cantidad}`).join(' | ');

        // Guardar en Sheets (la columna de número ya viene formateada desde el cliente)
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
                        data.total,
                        productosResumen,
                        '#' + data.nro,
                    ]],
                },
            });
            console.log('✅ Guardado en Sheets');
        } catch (sheetErr) {
            console.error('⚠️ Error Sheets:', sheetErr.message);
        }

        // Generar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Recibo_${data.nro}.pdf`);

        const doc = new PDFDocument({ size: 'A5', margin: 40 });
        doc.pipe(res);
        dibujarPDF(doc, data);
        doc.end();

    } catch (error) {
        console.error('❌ Error:', error);
        if (!res.headersSent) res.status(500).send('Error al procesar');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Piko Kopi en puerto ${PORT}`);
});