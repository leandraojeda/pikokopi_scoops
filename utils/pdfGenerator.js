const PDFDocument = require('pdfkit');
const fs = require('fs');

async function generarRecibo(datos, items) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A6', margin: 30 }); // Formato pequeño tierno
        const fileName = `recibo_${Date.now()}.pdf`;
        const filePath = `./public/temp/${fileName}`;

        // Asegurar que la carpeta exista
        if (!fs.existsSync('./public/temp')) fs.mkdirSync('./public/temp');

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Diseño
        doc.fillColor('#004f9f').fontSize(16).text('PIKO KOPI SHOP', { align: 'center' });
        doc.fontSize(8).text('Sucre, Bolivia', { align: 'center' });
        doc.moveDown();

        doc.fillColor('#000').fontSize(10).text(`Cliente: ${datos.nombre}`);
        doc.text(`Celular: ${datos.celular}`);
        doc.text(`Ciudad: ${datos.ciudad} (${datos.lugar_extra || ''})`);
        doc.moveDown();

        doc.text('--- PRODUCTOS ---');
        items.forEach(item => {
            doc.text(`${item.cant}x ${item.titulo} - ${item.subtotal} BS`);
        });

        doc.moveDown();
        doc.fontSize(12).fillColor('#FF4747').text(`TOTAL: ${datos.total} BS`, { align: 'right' });
        
        doc.fontSize(8).fillColor('#666').text(`Envío: ${datos.pago_envio === 'aqui' ? 'Pagado' : 'Por pagar en destino'}`, { align: 'left' });

        doc.end();
        stream.on('finish', () => resolve({ filePath, fileName }));
    });
}

module.exports = { generarRecibo };