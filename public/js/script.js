function verDetalle(id) {
    actual = productosData.find(p => p.id === id);
    
    // 1. Ocultar todas las sub-vistas primero
    document.querySelectorAll('.sub-view').forEach(v => v.style.display = 'none');

    // 2. Mostrar solo la que corresponde a la categoría
    if (actual.categoria === 'scoops') {
        document.getElementById('view-scoops').style.display = 'block';
    } else if (actual.categoria === 'ofertas') {
        document.getElementById('view-ofertas').style.display = 'block';
        // Calculamos un precio tachado falso (30% más)
        document.getElementById('precio-tachado').innerText = (actual.v[0].p * 1.3).toFixed(2) + " BS";
    } else if (actual.categoria === 'combos') {
        document.getElementById('view-combos').style.display = 'block';
    }

    // 3. Llenar los datos básicos (Foto, Título, Select)
    document.getElementById('sub-img').src = actual.imagen;
    document.getElementById('sub-titulo').innerText = actual.titulo;
    
    // Llenar el select correspondiente (buscamos el select activo)
    const activeSelect = document.querySelector('.sub-view[style*="block"] select');
    activeSelect.innerHTML = actual.v.map(v => `<option value="${v.n}" data-p="${v.p}">${v.n}</option>`).join('');
    
    actualizarPrecioSub();
    document.getElementById('sub-pestana').style.display = 'block';
}