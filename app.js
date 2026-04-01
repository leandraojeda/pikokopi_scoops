const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();

// --- 1. CONFIGURACIÓN DEL MOTOR Y CARPETAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// VITAL: Esta línea conecta tus estilos (styles.css) e imágenes (img/)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para leer datos de formularios y JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. BASE DE DATOS SQLITE ---
let db;

(async () => {
    // Abrimos la base de datos
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Creamos la tabla con la columna 'categoria' para tus subpestañas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS productos (
            id TEXT PRIMARY KEY,
            titulo TEXT,
            imagen TEXT,
            variantes TEXT,
            categoria TEXT
        )
    `);

    // Verificamos si está vacía para insertar tus productos de Piko Kopi
    const count = await db.get('SELECT COUNT(*) as count FROM productos');
    
    if (count.count === 0) {
        console.log("🛠️ Base de datos nueva. Insertando productos...");
        
        const productosIniciales = [
            // [ID, Título, Imagen, Variantes (JSON), Categoría]
            ['s1', 'Piko Scoop Kawaii Box', '/img/scoops.png', JSON.stringify([{n:'1 Scoop', p:100}, {n:'5 Scoops', p:460}]), 'scoops'],
            ['o1', 'Pack Oferta Snoopy', '/img/snoopy.png', JSON.stringify([{n:'Pack Estándar', p:80}]), 'ofertas'],
            ['c1', 'Combo Mega 1+2 Especial', '/img/1s2c.png', JSON.stringify([{n:'Combo Completo', p:150}]), 'combos'],
            ['s2', 'Scoop Glitter Edition', '/img/glitter.png', JSON.stringify([{n:'1 Scoop', p:120}]), 'scoops'],
            ['o2', 'Cápsulas en Liquidación', '/img/capsulas.png', JSON.stringify([{n:'3 Unidades', p:75}]), 'ofertas']
        ];

        for (const p of productosIniciales) {
            await db.run('INSERT INTO productos (id, titulo, imagen, variantes, categoria) VALUES (?, ?, ?, ?, ?)', p);
        }
        console.log("✅ Productos cargados correctamente.");
    }
})();

// --- 3. RUTAS ---

app.get('/', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM productos');
        
        const productos = rows.map(r => {
            let variantesParsed;
            try {
                // Si variantes existe y no es "undefined", lo parseamos
                variantesParsed = (r.variantes && r.variantes !== "undefined") 
                    ? JSON.parse(r.variantes) 
                    : [{n: 'Opción única', p: 0}]; // Valor por defecto por seguridad
            } catch (e) {
                console.error(`Error parseando variantes del producto ${r.id}:`, e);
                variantesParsed = [{n: 'Error de datos', p: 0}];
            }

            return {
                ...r,
                v: variantesParsed
            };
        });

        res.render('index', { productos });
    } catch (error) {
        console.error("Error crítico en la ruta principal:", error);
        res.status(500).send("Error interno: Revisa la consola de Node.");
    }
});

// --- 4. INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n******************************************`);
    console.log(`🚀 PIKO KOPI MARKETPLACE ACTIVO`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📂 Directorio: ${__dirname}`);
    console.log(`******************************************\n`);
});