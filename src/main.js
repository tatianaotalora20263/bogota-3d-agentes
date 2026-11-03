
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
  top: 85px;
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
