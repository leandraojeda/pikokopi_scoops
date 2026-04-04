// --- LISTA DE PRODUCTOS ---
const listaProductos = [
    // CATEGORÍA: PRODUCTOS
    {
        id: '1',
        titulo: 'Notas Cabeza Snoopy',
        cat: 'productos',
        precio: 12,
        img: '/img/notas-snoopy.jpg',
        variantes: [
            { nombre: 'Rojo', precio: 12 },
            { nombre: 'Azul', precio: 12 },
            { nombre: 'Verde', precio: 12 },
            { nombre: 'Amarillo', precio: 12 }
        ]
    },
    {
        id: '2',
        titulo: 'Binder Sanrio',
        cat: 'productos',
        precio: 26,
        img: '/img/binder-sanrio.jpg',
        variantes: [
            { nombre: 'Cinamorroll', precio: 26 },
            { nombre: 'Hello Kitty', precio: 26 },
            { nombre: 'Pompompurin', precio: 26 },
            { nombre: 'Pochacco', precio: 26 },
            { nombre: 'Kuromi', precio: 26 }
        ]
    },
    {
        id: '3',
        titulo: 'Sticker Black and White Style',
        cat: 'productos',
        precio: 8,
        img: '/img/sticker-bw.jpg'
    },
    {
        id: '4',
        titulo: 'Figuras de Yeso Sanrio',
        cat: 'productos',
        precio: 5,
        img: '/img/figuras-yeso.jpg'
    },
    {
        id: '5',
        titulo: 'Sellos en Tira',
        cat: 'productos',
        precio: 15,
        img: '/img/sellos-tira.jpg',
        variantes: [
            { nombre: 'Morado', precio: 15 },
            { nombre: 'Turquesa', precio: 15 },
            { nombre: 'Rosado', precio: 15 },
            { nombre: 'Azul', precio: 15 }
        ]
    },
    {
        id: '6',
        titulo: 'Llaveros Snoopy Goma',
        cat: 'productos',
        precio: 7,
        img: '/img/llaveros-snoopy.jpg',
        variantes: [
            { nombre: 'Piloto', precio: 7 },
            { nombre: 'Mujer', precio: 7 },
            { nombre: 'Normal', precio: 7 },
            { nombre: 'Sombrero', precio: 7 }
        ]
    },
    {
        id: '7',
        titulo: 'Boligrafo Hello Kitty',
        cat: 'productos',
        precio: 5,
        img: '/img/boligrafo-hellokitty.jpg',
        variantes: [
            { nombre: 'Rojo', precio: 5 },
            { nombre: 'Rosa', precio: 5 },
            { nombre: 'Blanco', precio: 5 }
        ]
    },
    {
        id: '8',
        titulo: 'Binder Hello Kitty JEAN',
        cat: 'productos',
        precio: 40,
        img: '/img/binder-hellokitty-jean.jpg'
    },

    // CATEGORÍA: SCOOPS
    {
        id: '9',
        titulo: 'Scoop Simple',
        cat: 'scoops',
        precio: 100,
        img: '/img/scoop.jpg',
        variantes: [
            { nombre: '1 Scoop (100 BS)', precio: 100 },
            { nombre: '2 Scoop (190 BS)', precio: 190 },
            { nombre: '3 Scoop (280 BS)', precio: 280 },
            { nombre: '4 Scoop (370 BS)', precio: 370 }
        ]
    },
    {
        id: '10',
        titulo: 'Capsulas Extra',
        cat: 'scoops',
        precio: 30,
        img: '/img/capsulas-extra.jpg',
        variantes: [
            { nombre: '1 Capsula Extra (30 BS)', precio: 30 },
            { nombre: '2 Capsulas Extra (55 BS)', precio: 55 },
            { nombre: '3 Capsulas Extra (80 BS)', precio: 80 }
        ]
    },
    {
        id: '11',
        titulo: 'Scoop + Capsulas Combo',
        cat: 'scoops',
        precio: 150,
        img: '/img/scoop-capsulas.jpg',
        variantes: [
            { nombre: '1 Scoop + 2 Capsulas (150 BS)', precio: 150 },
            { nombre: '2 Scoop + 2 Capsulas (240 BS)', precio: 240 }
        ]
    },

    // CATEGORÍA: PACKS
    {
        id: '12',
        titulo: 'Pack de Snoopy',
        cat: 'packs',
        precio: 80,
        img: '/img/pack-snoopy.jpg'
    },
    {
        id: '13',
        titulo: 'Pack de Cinamorroll',
        cat: 'packs',
        precio: 80,
        img: '/img/pack-cinamorroll.jpg'
    },
    {
        id: '14',
        titulo: 'Pack de My Melody',
        cat: 'packs',
        precio: 90,
        img: '/img/pack-mymelody.jpg'
    }
];

// --- RUTA 1: VER LA TIENDA ---
app.get('/', (req, res) => {
    res.render('index', { productos: listaProductos });
});