const express = require('express');
const router = express.Router();

// --- 📦 BASE DE DATOS DE PRODUCTOS ---
// Asegúrate de que las rutas de imagen (/img/...) existan en tu carpeta public
const productos = [
    { 
        id: 's1', titulo: 'Scoop Clásico', precio: '100 - 370', img: '/img/scoops.png', cat: 'scoops',
        descripcion: 'Un scoop sorpresa con accesorios kawaii aleatorios.',
        variantes: [
            { nombre: '1 Scoop', precio: 100 }, { nombre: '2 Scoops', precio: 190 },
            { nombre: '3 Scoops', precio: 280 }, { nombre: '4 Scoops', precio: 370 }
        ]
    },
    { 
        id: 's2', titulo: 'Combo Especial', precio: '150 - 240', img: '/img/combo.png', cat: 'scoops',
        descripcion: 'Mix de scoops con cápsulas adicionales.',
        variantes: [
            { nombre: '1 Scoop + 2 Caps', precio: 150 }, { nombre: '2 Scoops + 2 Caps', precio: 240 }
        ]
    },
    { 
        id: 'pk1', titulo: 'Packs Temáticos', precio: '80 - 90', img: '/img/packs.png', cat: 'packs',
        descripcion: 'Sets cerrados de personajes favoritos.',
        variantes: [
            { nombre: 'Snoopy', precio: 80 }, { nombre: 'Cinnamoroll', precio: 80 }, { nombre: 'My Melody', precio: 90 }
        ]
    },
    { 
        id: 'p1', titulo: 'Sticker B&W Style', precio: 8, img: '/img/stickers.png', cat: 'productos',
        descripcion: 'Stickers estéticos en blanco y negro.', variantes: [] 
    },
    { 
        id: 'p3', titulo: 'Lápices WEIBO', precio: 1, img: '/img/lapices.png', cat: 'productos',
        descripcion: 'Lápices con diseños tiernos.', variantes: [] 
    }
    // Puedes añadir los demás productos simples aquí...
];
// --- 🏠 RUTA PRINCIPAL (Catálogo) ---
router.get('/', (req, res) => {
    // Pasamos los productos a la vista index.ejs
    res.render('index', { productos });
});

// --- 🛒 RUTA DEL CARRITO (Checkout) ---
router.get('/checkout', (req, res) => {
    // Esto buscará el archivo: views/checkout.ejs
    res.render('checkout'); 
});


// --- 📩 RUTA PARA PROCESAR EL PEDIDO ---
router.post('/confirmar-pedido', (req, res) => {
    const datosCliente = req.body; // Aquí llegan: nombre, celular, ciudad, transporte...
    
    // 1. Aquí podrías llamar a la función de generar PDF que hicimos antes
    // 2. Por ahora, vamos a redirigir al WhatsApp con los datos
    
    const numeroPikoKopi = "59177143374"; // Tu número
    const mensaje = `¡Hola Piko Kopi! 💖%0A` +
                    `*Nuevo Pedido*%0A` +
                    `Nombre: ${datosCliente.nombre}%0A` +
                    `Ciudad: ${datosCliente.ciudad}%0A` +
                    `Transporte: ${datosCliente.transporte}%0A` +
                    `Pago Envío: ${datosCliente.pago_envio}%0A%0A` +
                    `_Enviado desde la web Piko Kopi_ ✨`;

    // Redirigimos al cliente a su WhatsApp para que te mande el mensaje
    res.redirect(`https://wa.me/${numeroPikoKopi}?text=${mensaje}`);
});
// --- 📤 EXPORTAR RUTAS ---
module.exports = router;