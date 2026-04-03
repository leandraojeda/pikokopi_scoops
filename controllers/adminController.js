const { sheets } = require('../config/google-auth');

async function verPanelAdmin(req, res) {
    // Por ahora simulamos la sesión, luego integraremos Google Login
    const userEmail = "pikokopi.store@gmail.com"; 

    if (userEmail !== process.env.ADMIN_EMAIL) {
        return res.status(403).send("Acceso denegado: Solo para Administración Piko Kopi.");
    }

    try {
        // Traemos los datos directamente de tu Google Sheets para que los veas en la web
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: 'ID_DE_TU_EXCEL',
            range: 'Sheet1!A2:H',
        });

        const pedidos = response.data.values || [];
        res.render('admin', { pedidos });
    } catch (error) {
        res.status(500).send("Error conectando con Google Sheets");
    }
}

module.exports = { verPanelAdmin };