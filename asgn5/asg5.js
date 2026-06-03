import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const scene = new THREE.Scene();

const exrLoader = new EXRLoader();

exrLoader.load('./skybox/grasslands_sunset_4k.exr', function(texture){
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.background = texture;
    scene.environment = texture;
});

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/ window.innerHeight,
    0.1,
    1000
);

camera.position.z = 6;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff,2);
directionalLight.position.set(-1,2,4);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 30);
pointLight.position.set(3, 3, 3);
scene.add(pointLight);

const loader = new THREE.TextureLoader();

const wallTexture = loader.load('./img/wall.png');
const blockTexture = loader.load('./img/blocks.jpg');
const groundTexture = loader.load('./img/ground.jpg');
const pillarTexture = loader.load('./img/pillar.jpg');
const rockTexture = loader.load('./img/rocks.jpg');

groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10);

const boxGeometry = new THREE.BoxGeometry(1,1,1);

const groundGeometry = new THREE.PlaneGeometry(30, 30);
const groundMaterial = new THREE.MeshPhongMaterial({
    map: groundTexture
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.2;

scene.add(ground);

function makeCube(color,x){
    const material = new THREE.MeshPhongMaterial ({color: color});
    const cube = new THREE.Mesh(boxGeometry, material);

    cube.position.x = x;
    scene.add(cube);

    return cube;
}

const gltfLoader = new GLTFLoader();

gltfLoader.load(
    './models/Sword.glb',
    function (gltf) {
        const model = gltf.scene;

        model.position.set(0, -0.8, -1.5);
        model.scale.set(1, 1, 1);

        model.rotation.y = -Math.PI / 2;

        scene.add(model);
    },
    undefined,
    function (error) {
        console.error('Error loading model:', error);
    }
);

function makeTextureCube(texture, x){
    const material = new THREE.MeshPhongMaterial({map: texture});
    const cube = new THREE.Mesh(boxGeometry, material);
    cube.position.x = x;
    scene.add(cube);
    return cube;
}

const cubes = [
    makeCube(0x44aa88, -2),
    makeTextureCube(wallTexture, 0),
    makeCube(0xaa8844, 2),
];

function makeRock(x, z, size){
    const geometry = new THREE.SphereGeometry(size, 16, 8);
    const material = new THREE.MeshPhongMaterial({
        map: rockTexture
    });

    const rock = new THREE.Mesh(geometry, material);

    rock.position.set(x, -1, z);
    rock.scale.y = 0.6;

    scene.add(rock);
    return rock;
}

function makePillar(x,z){
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 2, 32);
    const material = new THREE.MeshPhongMaterial({
        map: pillarTexture
    });

    const pillar = new THREE.Mesh(geometry, material);

    pillar.position.set(x, 0, z);

    scene.add(pillar);
    return pillar;
}

function makeBlock(x, y, z) {
    const geometry = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    const material = new THREE.MeshPhongMaterial({
        map: blockTexture
    });

    const block = new THREE.Mesh(geometry, material);

    block.position.set(x, y, z);

    scene.add(block);
    return block;
}

const rocks = [
    makeRock(-5, -4, 0.4),
    makeRock(-3, -5, 0.3),
    makeRock(-1, -4, 0.35),
    makeRock(2, -5, 0.45),
    makeRock(5, -4, 0.3),
    makeRock(-5, 2, 0.4),
    makeRock(-3, 4, 0.35),
    makeRock(0, 5, 0.45),
    makeRock(3, 4, 0.3),
    makeRock(5, 2, 0.4),
    makeRock(-6, -1, 0.35),
    makeRock(6, -1, 0.35),
];

const pillars = [
    makePillar(-3, -2),
    makePillar(3, -2),
    makePillar(-3, 2),
    makePillar(3, 2),
];

const blocks = [
    makeBlock(-1.5, -1, 0),
    makeBlock(1.5, -1, 0),
    makeBlock(0, -1, -1.5),
    makeBlock(0, -1, 1.5),
];


function animate(time){
    time *= 0.001;

    cubes.forEach((cube, index) => {
        const speed = 1 + index * 0.3;
        const rotation = time * speed;

        cube.rotation.x = rotation;
        cube.rotation.y = rotation;
    });
    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);