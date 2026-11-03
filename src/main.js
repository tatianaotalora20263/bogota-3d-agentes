
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

    etiquetaAltura.textContent =
      'Elevacion: ' +
      elevacion.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' m';

    etiquetaAltura.style.left = (evento.clientX + 15) + 'px';
    etiquetaAltura.style.top = (evento.clientY + 15) + 'px';
    etiquetaAltura.style.display = 'block';
  } else {
    etiquetaAltura.style.display = 'none';
  }
}

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
