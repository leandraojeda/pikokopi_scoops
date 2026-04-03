const { drive, sheets } = require('../config/google-auth');
const { generarRecibo } = require('../utils/pdfGenerator');
const fs = require('fs');

async function procesarPedido(req, res) {
    const datos = req.body;
    // (Aquí obtendrías los items del carrito de la sesión)
    const itemsPrueba = [{ cant: 1, titulo: "Scoop Especial", subtotal: 100 }]; 
    datos.total = 100; // Ejemplo

    try {
        // 1. Generar PDF Localmente
        const { filePath, fileName } = await generarRecibo(datos, itemsPrueba);

        // 2. Subir a Google Drive
        const fileMetadata = { name: fileName, parents: ['ID_DE_TU_CARPETA_RECIBOS'] };
        const media = { mimeType: 'application/pdf', body: fs.createReadStream(filePath) };
        const fileDrive = await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' });

        // 3. Anotar en Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: 'ID_DE_TU_EXCEL',
            range: 'Sheet1!A2',
            valueInputOption: 'RAW',
            resource: { values: [[new Date().toLocaleDateString(), datos.nombre, datos.celular, datos.ciudad, datos.transporte, datos.total, 'Pendiente', fileDrive.data.id]] }
        });

        // 4. Limpiar archivo temporal y redirigir
        fs.unlinkSync(filePath);
        res.redirect(`https://wa.me/59177143374?text=PedidoConfirmado_ID_${fileDrive.data.id}`);

    } catch (error) {
        console.error(error);
        res.status(500).send("Error procesando con Google");
    }
}

module.exports = { procesarPedido };