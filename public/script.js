function cambiarCantidad(id, valor) {
    const input = document.getElementById(id);
    let actual = parseInt(input.value);
    actual += valor;
    if (actual < 0) actual = 0;
    input.value = actual;
}

async function enviarPedido() {
    const payload = {
        nombre: document.getElementById('nombre').value.trim(),
        ci: document.getElementById('ci').value.trim(),
        ciudad: document.getElementById('ciudad').value,
        capsulas: parseInt(document.getElementById('capsulas').value) || 0,
        cucharas: parseInt(document.getElementById('cucharas').value) || 0
    };

    // Validación: que tenga nombre, ciudad y al menos un producto
    if(!payload.nombre || !payload.ciudad || (payload.capsulas === 0 && payload.cucharas === 0)) {
        alert("⚠️ Por favor selecciona productos y completa tus datos antes de enviar.");
        return;
    }

    try {
        // Mostramos un mensaje de "Enviando..." en el botón
        const btn = document.querySelector('.btn-enviar');
        const originalText = btn.innerText;
        btn.innerText = "PROCESANDO...";
        btn.disabled = true;

        const response = await fetch('/api/pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            // Si el servidor responde bien, nos vamos a WhatsApp
            window.location.href = data.url;
        } else {
            alert("Hubo un error al procesar el pedido.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error("Error:", e);
        alert("No se pudo conectar con el servidor. Revisa tu conexión.");
        document.querySelector('.btn-enviar').disabled = false;
    }
}