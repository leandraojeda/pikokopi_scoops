function cambiarCantidad(id, valor) {
    const input = document.getElementById(id);
    let actual = parseInt(input.value);
    actual += valor;
    if (actual < 0) actual = 0;
    input.value = actual;
}

async function enviarPedido() {
    const payload = {
        nombre: document.getElementById('nombre').value,
        ci: document.getElementById('ci').value,
        ciudad: document.getElementById('ciudad').value,
        capsulas: document.getElementById('capsulas').value,
        cucharas: document.getElementById('cucharas').value
    };

    if(!payload.nombre || !payload.ciudad || (payload.capsulas == 0 && payload.cucharas == 0)) {
        alert("⚠️ Por favor selecciona productos y completa tus datos.");
        return;
    }

    // El resto de tu fetch sigue igual...
}