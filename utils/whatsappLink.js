function crearLinkWhatsApp(datos, total) {
    const numeroAdmin = "59177143374";
    const mensaje = `¡Hola Piko Kopi! 💖%0A` +
        `Nuevo pedido de: *${datos.nombre}*%0A` +
        `Ciudad: ${datos.ciudad} ${datos.lugar_extra || ''}%0A` +
        `Transporte: ${datos.transporte}%0A` +
        `Total: *${total} BS*%0A%0A` +
        `Confirmar envío, por favor. ✨`;
    
    return `https://wa.me/${numeroAdmin}?text=${mensaje}`;
}

module.exports = { crearLinkWhatsApp };