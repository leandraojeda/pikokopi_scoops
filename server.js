const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(express.json());

// LA CORRECCIÓN: Usar path.join para que Render encuentre siempre la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

let db;

// Inicializar Base de Datos (con ruta absoluta para evitar errores de escritura)
(async () => {
    try {
        db = await open({
            filename: path.join(__dirname, 'pedidos.db'),
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
        console.log("Base de datos SQLite lista ✅");
    } catch (error) {
        console.error("Error al abrir la base de datos:", error);
    }
})();

// Endpoint para guardar pedido
app.post('/api/pedido', async (req, res) => {
    try {
        const { nombre, ci, ciudad, capsulas, cucharas } = req.body;
        const productos = `${capsulas} Cápsulas y ${cucharas} Cucharas`;

        await db.run(
            'INSERT INTO pedidos (nombre_completo, ci, ciudad, productos) VALUES (?, ?, ?, ?)',
            [nombre, ci, ciudad, productos]
        );

        // Reemplaza el 591XXXXXXXX por tu número real de WhatsApp
        const telefono = "59178619934"; // Ejemplo
        const mensaje = encodeURIComponent(`*PEDIDO NUEVO*\n*Nombre:* ${nombre}\n*CI:* ${ci}\n*Ciudad:* ${ciudad}\n*Pedido:* ${productos}`);
        const url = `https://wa.me/${telefono}?text=${mensaje}`;

        res.json({ success: true, url });
    } catch (err) {
        console.error("Error en POST /api/pedido:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Ruta comodín para asegurar que cargue el index.html
// Cambia esto:
// app.get('*', (req, res) => { ... });

// Por esto (la nueva sintaxis de Express 5):
// REEMPLAZA TU RUTA FINAL POR ESTA:
app.get('*', (req, res, next) => {
    // Si la ruta empieza por /api, deja que pase a los endpoints
    if (req.path.startsWith('/api')) {
        return next();
    }
    // Para todo lo demás, envía el index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));