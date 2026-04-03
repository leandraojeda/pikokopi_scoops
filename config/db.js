const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function conectarDB() {
    return open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
}

// Función para inicializar tablas si no existen
async function inicializarTablas(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS productos (
            id TEXT PRIMARY KEY,
            titulo TEXT,
            precio REAL,
            imagen TEXT,
            categoria TEXT
        )
    `);
}

module.exports = { conectarDB, inicializarTablas };