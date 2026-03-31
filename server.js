const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let db;

// Inicializar Base de Datos
(async () => {
    db = await open({
        filename: './pedidos.db',
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_completo TEXT,
            ci TEXT,
            ciudad TEXT,
            productos TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
})();

// Endpoint para guardar pedido y generar Link
app.post('/api/pedido', async (req, res) => {
    try {
        const { nombre, ci, ciudad, capsulas, cucharas } = req.body;
        const productos = `${capsulas} Cápsulas y ${cucharas} Cucharas`;

        // Guardar en SQLite
        await db.run(
            'INSERT INTO pedidos (nombre_completo, ci, ciudad, productos) VALUES (?, ?, ?, ?)',
            [nombre, ci, ciudad, productos]
        );

        // Link de WhatsApp Business (Usa tu número real aquí)
        const telefono = "591XXXXXXXX"; 
        const mensaje = `*PEDIDO NUEVO*%0A*Nombre:* ${nombre}%0A*CI:* ${ci}%0A*Ciudad:* ${ciudad}%0A*Pedido:* ${productos}`;
        const url = `https://wa.me/${telefono}?text=${mensaje}`;

        res.json({ success: true, url });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));