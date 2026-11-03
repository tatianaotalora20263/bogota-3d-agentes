
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const contenedor = document.getElementById('visor');
const estado = document.getElementById('estado');

// Escena
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x101b28);

// Cámara
const camara = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  10,
  500000
);

// Renderizador
const renderizador = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true
});

renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.outputColorSpace = THREE.SRGBColorSpace;
contenedor.appendChild(renderizador.domElement);

// Iluminación
escena.add(new THREE.AmbientLight(0xffffff, 2));

const luz = new THREE.DirectionalLight(0xffffff, 2);
luz.position.set(30000, 80000, 50000);
escena.add(luz);

// Controles del mouse
const controles = new OrbitControls(camara, renderizador.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.08;

// Cargar terreno de Bogotá
let superficieTerreno = null;
const cargador = new GLTFLoader();

estado.textContent = 'Cargando terreno 3D...';

cargador.load(
  `${import.meta.env.BASE_URL}models/Bogota_Terreno.glb`,
  (gltf) => {
    const terreno = gltf.scene;
    escena.add(terreno);
    superficieTerreno = terreno;

    // Calcular dimensiones y centro del modelo
    const caja = new THREE.Box3().setFromObject(terreno);
    const centro = caja.getCenter(new THREE.Vector3());
    const dimensiones = caja.getSize(new THREE.Vector3());

    controles.target.copy(centro);

    // Vista inicial oblicua del terreno
    const distancia = Math.max(dimensiones.x, dimensiones.z) * 1.3;
    camara.position.set(
      centro.x + distancia * 0.65,
      centro.y + distancia * 0.65,
      centro.z + distancia * 0.75
    );

    camara.lookAt(centro);
    controles.update();

    estado.textContent = 'Terreno cargado correctamente';
    console.log('Dimensiones del terreno (m):', dimensiones);
  },
  undefined,
  (error) => {
    console.error('Error cargando GLB:', error);
    estado.textContent = 'Error al cargar el terreno';
  }
);


// Herramienta de medicion
let modoMedicion = false;

const botonMedicion = document.createElement('button');
botonMedicion.textContent = 'Medir distancia';

botonMedicion.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  padding: 12px 18px;
  background: #176b52;
  color: white;
  border: 1px solid #60b99b;
  border-radius: 8px;
  font: 600 14px Arial, sans-serif;
  cursor: pointer;
`;

document.body.appendChild(botonMedicion);

botonMedicion.addEventListener('click', () => {
  modoMedicion = !modoMedicion;

  botonMedicion.textContent = modoMedicion
    ? 'Salir de medicion'
    : 'Medir distancia';

  botonMedicion.style.background = modoMedicion
    ? '#9b5034'
    : '#176b52';
});
// Herramienta de perfil topografico
let modoPerfil = false;

const botonPerfil = document.createElement('button');
botonPerfil.textContent = 'Perfil topografico';

botonPerfil.style.cssText = `
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 100;
  padding: 12px 18px;
  background: #245b85;
  color: white;
  border: 1px solid #75b8e6;
  border-radius: 8px;
  font: 600 14px Arial, sans-serif;
  cursor: pointer;
`;

document.body.appendChild(botonPerfil);

botonPerfil.addEventListener('click', () => {
  modoPerfil = !modoPerfil;

  if (modoPerfil && modoMedicion) {
    botonMedicion.click();
  }

  botonPerfil.textContent = modoPerfil
    ? 'Salir del perfil'
    : 'Perfil topografico';

  botonPerfil.style.background = modoPerfil
    ? '#9b5034'
    : '#245b85';
});
// Consulta interactiva de elevacion
const raycaster = new THREE.Raycaster();
const posicionMouse = new THREE.Vector2();
const etiquetaAltura = document.createElement('div');

etiquetaAltura.style.cssText = `
  position: fixed;
  display: none;
  pointer-events: none;
  z-index: 100;
  padding: 9px 13px;
  background: rgba(12,25,38,0.94);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  font: 14px Arial, sans-serif;
`;

document.body.appendChild(etiquetaAltura);



function consultarElevacion(evento) {
  if (!superficieTerreno) return;

  const rect = renderizador.domElement.getBoundingClientRect();

  posicionMouse.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
  posicionMouse.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(posicionMouse, camara);

  const intersecciones = raycaster.intersectObject(superficieTerreno, true);

  if (intersecciones.length > 0) {
    const elevacion = intersecciones[0].point.y;

    const este = intersecciones[0].point.x + 4859829.112538762;
    const norte = 2026133.7727856515 - intersecciones[0].point.z;

    const formato = (valor) => valor.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    etiquetaAltura.innerHTML =
      '<strong>Coordenadas del terreno</strong><br>' +
      'Este: ' + formato(este) + ' m<br>' +
      'Norte: ' + formato(norte) + ' m<br>' +
      'Elevacion: ' + formato(elevacion) + ' m<br>' +
      '<small>MAGNA-SIRGAS / EPSG:9377</small>';
    etiquetaAltura.style.left = (evento.clientX + 15) + 'px';
    etiquetaAltura.style.top = (evento.clientY + 15) + 'px';
    etiquetaAltura.style.display = 'block';
  } else {
    etiquetaAltura.style.display = 'none';
  }
}

// Medicion entre dos puntos del terreno
const puntosMedicion = [];
const objetosMedicion = [];

const panelMedicion = document.createElement('div');
panelMedicion.style.cssText = `
  position: fixed;
  top: 140px;
  right: 20px;
  z-index: 100;
  width: 260px;
  padding: 14px;
  background: rgba(12,25,38,0.94);
  color: white;
  border: 1px solid #60b99b;
  border-radius: 8px;
  font: 14px Arial, sans-serif;
  display: none;
`;

document.body.appendChild(panelMedicion);

function limpiarMedicion() {
  puntosMedicion.length = 0;

  for (const objeto of objetosMedicion) {
    escena.remove(objeto);
    objeto.geometry.dispose();

    if (Array.isArray(objeto.material)) {
      objeto.material.forEach(material => material.dispose());
    } else {
      objeto.material.dispose();
    }
  }

  objetosMedicion.length = 0;
}

function agregarMarcador(punto, color) {
  const geometria = new THREE.SphereGeometry(180, 12, 12);
  const material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false
  });

  const marcador = new THREE.Mesh(geometria, material);
  marcador.position.copy(punto);
  marcador.renderOrder = 10;

  escena.add(marcador);
  objetosMedicion.push(marcador);
}

function seleccionarPuntoMedicion(evento) {
  if (!modoMedicion || !superficieTerreno) return;
  if (evento.button !== 0) return;

  const rect = renderizador.domElement.getBoundingClientRect();

  posicionMouse.x =
    ((evento.clientX - rect.left) / rect.width) * 2 - 1;

  posicionMouse.y =
    -((evento.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(posicionMouse, camara);

  const impactos = raycaster.intersectObject(superficieTerreno, true);
  if (impactos.length === 0) return;

  if (puntosMedicion.length === 2) {
    limpiarMedicion();
  }

  const punto = impactos[0].point.clone();
  puntosMedicion.push(punto);

  agregarMarcador(
    punto,
    puntosMedicion.length === 1 ? 0x00ff88 : 0xffcc44
  );

  if (puntosMedicion.length === 1) {
    panelMedicion.innerHTML =
      '<strong>Medicion de distancia</strong><br>' +
      'Punto A seleccionado.<br>' +
      'Selecciona el punto B.';
    return;
  }

  const a = puntosMedicion[0];
  const b = puntosMedicion[1];

  const distanciaHorizontal = Math.hypot(
    b.x - a.x,
    b.z - a.z
  );

  const distancia3D = a.distanceTo(b);
  const desnivel = b.y - a.y;

  const geometriaLinea = new THREE.BufferGeometry()
    .setFromPoints([a, b]);

  const materialLinea = new THREE.LineBasicMaterial({
    color: 0xffcc44,
    depthTest: false
  });

  const linea = new THREE.Line(geometriaLinea, materialLinea);
  linea.renderOrder = 9;

  escena.add(linea);
  objetosMedicion.push(linea);

  const formato = valor =>
    valor.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  panelMedicion.innerHTML =
    '<strong>Resultado de medicion</strong><br><br>' +
    'Distancia horizontal: ' + formato(distanciaHorizontal) + ' m<br>' +
    'Distancia 3D: ' + formato(distancia3D) + ' m<br>' +
    'Desnivel B - A: ' + formato(desnivel) + ' m<br><br>' +
    '<small>Haz clic para iniciar otra medicion.</small>';
}

let inicioPuntero = null;

renderizador.domElement.addEventListener('pointerdown', evento => {
  if (!modoMedicion || evento.button !== 0) return;
  inicioPuntero = { x: evento.clientX, y: evento.clientY };
});

renderizador.domElement.addEventListener('pointerup', evento => {
  if (!modoMedicion || !inicioPuntero) return;

  const desplazamiento = Math.hypot(
    evento.clientX - inicioPuntero.x,
    evento.clientY - inicioPuntero.y
  );

  inicioPuntero = null;

  if (desplazamiento < 5) {
    seleccionarPuntoMedicion(evento);
  }
});

// Desactivar el perfil cuando se active la medicion
botonMedicion.addEventListener('click', () => {
  if (modoMedicion && modoPerfil) {
    botonPerfil.click();
  }
});
// Mostrar u ocultar panel al activar la herramienta
botonMedicion.addEventListener('click', () => {
  panelMedicion.style.display = modoMedicion ? 'block' : 'none';

  if (modoMedicion) {
    limpiarMedicion();
    panelMedicion.innerHTML =
      '<strong>Medicion de distancia</strong><br>' +
      'Selecciona el punto A sobre el terreno.';
  } else {
    limpiarMedicion();
    inicioPuntero = null;
  }
});
// Muestreo de elevaciones para el perfil topografico
function calcularMuestrasPerfil(puntoA, puntoB) {
  if (!superficieTerreno) return [];

  const distanciaHorizontal = Math.hypot(
    puntoB.x - puntoA.x,
    puntoB.z - puntoA.z
  );

  // Intervalo aproximado de 90 metros
  const segmentos = Math.max(
    1,
    Math.ceil(distanciaHorizontal / 90)
  );

  const cajaTerreno = new THREE.Box3().setFromObject(superficieTerreno);
  const alturaInicio = cajaTerreno.max.y + 1000;

  const origenRayo = new THREE.Vector3();
  const direccionVertical = new THREE.Vector3(0, -1, 0);
  const raycasterPerfil = new THREE.Raycaster();

  const muestras = [];

  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;

    const x = puntoA.x + (puntoB.x - puntoA.x) * t;
    const z = puntoA.z + (puntoB.z - puntoA.z) * t;

    origenRayo.set(x, alturaInicio, z);

    raycasterPerfil.set(origenRayo, direccionVertical);

    const impactos = raycasterPerfil.intersectObject(
      superficieTerreno,
      true
    );

    muestras.push({
      distancia: distanciaHorizontal * t,
      elevacion: impactos.length > 0
        ? impactos[0].point.y
        : null
    });
  }

  return muestras;
}
// Generar grafica SVG del perfil topografico
function generarGraficaPerfil(muestras) {
  const validas = muestras.filter(m => Number.isFinite(m.elevacion));

  if (validas.length < 2) {
    return '<p>No hay suficientes muestras para graficar.</p>';
  }

  const ancho = 500;
  const alto = 250;
  const izquierda = 65;
  const derecha = 20;
  const arriba = 20;
  const abajo = 45;

  const anchoGrafica = ancho - izquierda - derecha;
  const altoGrafica = alto - arriba - abajo;

  const distanciaMax = muestras[muestras.length - 1].distancia;
  const elevMin = Math.min(...validas.map(m => m.elevacion));
  const elevMax = Math.max(...validas.map(m => m.elevacion));

  const margen = Math.max((elevMax - elevMin) * 0.1, 10);
  const minimoY = elevMin - margen;
  const maximoY = elevMax + margen;

  const escalaX = d =>
    izquierda + (d / Math.max(distanciaMax, 1)) * anchoGrafica;

  const escalaY = e =>
    arriba + (1 - (e - minimoY) / (maximoY - minimoY)) * altoGrafica;

  const formato = valor =>
    valor.toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });

  let lineas = '';
  let etiquetas = '';

  for (let i = 0; i <= 4; i++) {
    const elevacion = minimoY + (maximoY - minimoY) * i / 4;
    const y = escalaY(elevacion);

    lineas +=
      '<line x1="' + izquierda + '" y1="' + y +
      '" x2="' + (ancho - derecha) + '" y2="' + y +
      '" stroke="#456075" stroke-dasharray="4 4"/>';

    etiquetas +=
      '<text x="' + (izquierda - 8) + '" y="' + (y + 4) +
      '" fill="white" font-size="11" text-anchor="end">' +
      formato(elevacion) + '</text>';
  }

  let trazo = '';
  let segmentoAbierto = false;

  for (const muestra of muestras) {
    if (!Number.isFinite(muestra.elevacion)) {
      segmentoAbierto = false;
      continue;
    }

    const x = escalaX(muestra.distancia);
    const y = escalaY(muestra.elevacion);

    trazo += (segmentoAbierto ? ' L ' : ' M ') + x + ' ' + y;
    segmentoAbierto = true;
  }

  return `
    <svg viewBox="0 0 500 250"
         style="width:100%;height:auto;display:block"
         role="img"
         aria-label="Perfil topografico de elevacion frente a distancia">

      ${lineas}
      ${etiquetas}

      <line x1="${izquierda}" y1="${arriba}"
            x2="${izquierda}" y2="${alto - abajo}"
            stroke="white"/>

      <line x1="${izquierda}" y1="${alto - abajo}"
            x2="${ancho - derecha}" y2="${alto - abajo}"
            stroke="white"/>

      <path d="${trazo}"
            fill="none"
            stroke="#00ff88"
            stroke-width="2.5"
            stroke-linejoin="round"/>

      <text x="${izquierda}" y="${alto - 25}"
            fill="white" font-size="11">0</text>

      <text x="${ancho - derecha}" y="${alto - 25}"
            fill="white" font-size="11" text-anchor="end">
        ${formato(distanciaMax)} m
      </text>

      <text x="${ancho / 2}" y="${alto - 5}"
            fill="white" font-size="12" text-anchor="middle">
        Distancia horizontal (m)
      </text>

      <text x="15" y="${alto / 2}"
            fill="white" font-size="12"
            text-anchor="middle"
            transform="rotate(-90 15 ${alto / 2})">
        Elevacion (m)
      </text>
    </svg>
  `;
}
// Panel del perfil topografico
const panelPerfil = document.createElement('div');

panelPerfil.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  width: min(650px, calc(100vw - 40px));
  max-height: 65vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px;
  background: rgba(12,25,38,0.96);
  color: white;
  border: 1px solid #75b8e6;
  border-radius: 10px;
  font: 14px Arial, sans-serif;
  display: none;
`;

document.body.appendChild(panelPerfil);

botonPerfil.addEventListener('click', () => {
  panelPerfil.style.display = modoPerfil ? 'block' : 'none';

  if (modoPerfil) {
    panelPerfil.innerHTML =
      '<strong>Perfil topografico</strong><br><br>' +
      'Selecciona el punto A sobre el terreno.';
  }
});
// Seleccion de puntos para el perfil topografico
const puntosPerfil = [];
const objetosPerfil = [];
let inicioPunteroPerfil = null;

function limpiarPerfil() {
  puntosPerfil.length = 0;

  for (const objeto of objetosPerfil) {
    escena.remove(objeto);
    objeto.geometry.dispose();
    objeto.material.dispose();
  }

  objetosPerfil.length = 0;
}

function seleccionarPuntoPerfil(evento) {
  if (!modoPerfil || !superficieTerreno || evento.button !== 0) return;

  const rect = renderizador.domElement.getBoundingClientRect();

  posicionMouse.x =
    ((evento.clientX - rect.left) / rect.width) * 2 - 1;

  posicionMouse.y =
    -((evento.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(posicionMouse, camara);

  const impactos = raycaster.intersectObject(superficieTerreno, true);
  if (impactos.length === 0) return;

  if (puntosPerfil.length === 2) {
    limpiarPerfil();
  }

  const punto = impactos[0].point.clone();
  puntosPerfil.push(punto);

  const geometria = new THREE.SphereGeometry(180, 12, 12);
  const material = new THREE.MeshBasicMaterial({
    color: puntosPerfil.length === 1 ? 0x00ff88 : 0xffcc44,
    depthTest: false
  });

  const marcador = new THREE.Mesh(geometria, material);
  marcador.position.copy(punto);
  marcador.renderOrder = 10;

  escena.add(marcador);
  objetosPerfil.push(marcador);

  if (puntosPerfil.length === 1) {
    panelPerfil.innerHTML =
      '<strong>Perfil topografico</strong><br><br>' +
      'Punto A seleccionado. Selecciona el punto B.';
    return;
  }

  const a = puntosPerfil[0];
  const b = puntosPerfil[1];

  const geometriaLinea = new THREE.BufferGeometry()
    .setFromPoints([a, b]);

  const materialLinea = new THREE.LineBasicMaterial({
    color: 0x75b8e6,
    depthTest: false
  });

  const linea = new THREE.Line(geometriaLinea, materialLinea);
  linea.renderOrder = 9;

  escena.add(linea);
  objetosPerfil.push(linea);

  const muestras = calcularMuestrasPerfil(a, b);
  const validas = muestras.filter(m => m.elevacion !== null);

  if (validas.length === 0) {
    panelPerfil.textContent = 'No se pudieron obtener elevaciones.';
    return;
  }

  const minima = Math.min(...validas.map(m => m.elevacion));
  const maxima = Math.max(...validas.map(m => m.elevacion));
  const distancia = Math.hypot(b.x - a.x, b.z - a.z);

  const formato = valor => valor.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  panelPerfil.innerHTML =
    '<strong>Perfil topografico</strong><br><br>' +
    'Distancia horizontal: ' + formato(distancia) + ' m<br>' +
    'Elevacion minima: ' + formato(minima) + ' m<br>' +
    'Elevacion maxima: ' + formato(maxima) + ' m<br>' +
    'Muestras validas: ' + validas.length + '<br><br>' +
    generarGraficaPerfil(muestras) + '<small>Haz clic sobre el terreno para iniciar otro perfil.</small>';

  console.log('Muestras del perfil:', muestras);
}

renderizador.domElement.addEventListener('pointerdown', evento => {
  if (!modoPerfil || evento.button !== 0) return;

  inicioPunteroPerfil = {
    x: evento.clientX,
    y: evento.clientY
  };
});

renderizador.domElement.addEventListener('pointerup', evento => {
  if (!modoPerfil || !inicioPunteroPerfil) return;

  const desplazamiento = Math.hypot(
    evento.clientX - inicioPunteroPerfil.x,
    evento.clientY - inicioPunteroPerfil.y
  );

  inicioPunteroPerfil = null;

  if (desplazamiento < 5) {
    seleccionarPuntoPerfil(evento);
  }
});

botonPerfil.addEventListener('click', () => {
  limpiarPerfil();
  inicioPunteroPerfil = null;
});
renderizador.domElement.addEventListener('pointermove', consultarElevacion);

renderizador.domElement.addEventListener('pointerleave', () => {
  etiquetaAltura.style.display = 'none';
});
// Adaptar al tamaño de la ventana
window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
});

// Animación
function animar() {
  requestAnimationFrame(animar);
  controles.update();
  renderizador.render(escena, camara);
}

animar();
