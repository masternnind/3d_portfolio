// --- 1. Scene, Camera, Renderer 생성 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5dc);

// FOV를 기존 75에서 40으로 줄여서, 원근감을 조정합니다.
const camera = new THREE.PerspectiveCamera(
  40, // FOV를 40으로 조정
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 20); // 카메라를 약간 뒤로 이동하여 충돌 방지
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xf5f5dc);
document.body.appendChild(renderer.domElement);

// --- 2. 방 구성 ---
// 방의 크기를 2배로 확장
const roomWidth = 300, roomHeight = 180, roomDepth = 300; // 기존 값의 2배
const roomGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
const roomMaterials = [
  new THREE.MeshBasicMaterial({ color: 0xffe4c4, side: THREE.BackSide }), // 오른쪽 벽
  new THREE.MeshBasicMaterial({ color: 0xffe4c4, side: THREE.BackSide }), // 왼쪽 벽
  new THREE.MeshBasicMaterial({ color: 0xffe4c4, side: THREE.BackSide }), // 천장
  new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.BackSide }), // 바닥
  new THREE.MeshBasicMaterial({ color: 0xffe4c4, side: THREE.BackSide }), // 후면 벽
  new THREE.MeshBasicMaterial({ color: 0xffe4c4, side: THREE.BackSide })  // 전면 벽
];
const room = new THREE.Mesh(roomGeometry, roomMaterials);
scene.add(room);

// 바닥을 따로 만들어 나무 텍스처를 적용
const textureLoader = new THREE.TextureLoader();
const woodTexture = textureLoader.load('textures/wood.jpg'); // 적절한 나무 텍스처 파일 경로로 수정
woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(10, 10); // 텍스처 반복 횟수도 조정

const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
const floorMaterial = new THREE.MeshPhongMaterial({
  map: woodTexture,
  side: THREE.DoubleSide
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- 3. 장식용 소품(예: 육면체) 추가 ---
function createFixedBox(x, z) {
  const width = THREE.MathUtils.randFloat(20, 25);
  const height = 30; // 기존 높이 15에서 2배로 증가
  const depth = THREE.MathUtils.randFloat(20, 25);
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const tonedColors = [0x8B8B83, 0x7E7E79, 0x969690, 0x8C8B8B, 0xA9A9A9];
  const color = tonedColors[Math.floor(Math.random() * tonedColors.length)];
  const material = new THREE.MeshPhongMaterial({ color: color });
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x, height / 2, z); // 바닥에 딱 맞게 (y = height/2)
  scene.add(box);
}

// 육면체 생성
const boxPositions = [
  [-120, -120],
  [-60, -60],
  [0, 120],
  [80, 40],
  [160, -20],
  [100, -100]
];
boxPositions.forEach(([x, z]) => createFixedBox(x, z));

// --- 4. 조명 추가 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(0, 20, 0);
scene.add(ambientLight, pointLight);

// --- 5. 애니메이션 루프 ---
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- 6. GSAP ScrollTrigger를 이용한 카메라 이동 경로 ---
// 랜덤 좌표 생성 함수
function generateRandomPoints(count, range) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.randFloat(-range, range);
    const z = THREE.MathUtils.randFloat(-range, range);
    points.push(new THREE.Vector3(x, 10, z)); // y값(높이)은 고정
  }
  return points;
}

// 랜덤 경로 생성
const randomPathPoints = generateRandomPoints(10, 140); // 10개의 랜덤 좌표, 범위는 -140 ~ 140
const cameraPath = new THREE.CatmullRomCurve3(randomPathPoints, false);

const tweenObj = { t: 0 };
gsap.registerPlugin(ScrollTrigger);
gsap.to(tweenObj, {
  t: 1,
  ease: "power4.out",
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "top top",
    end: "bottom+=12000 bottom", // 스크롤 길이를 더 늘려 이동 속도를 줄임
    scrub: 12, // 스크롤과 애니메이션의 동기화를 더 느리게 (값이 클수록 느려짐)
    pin: true,
    toggleActions: "play none none none"
    // markers: true // 디버깅 시 활성화
  },
  onUpdate: () => {
    // 현재 카메라 위치
    const currentPos = cameraPath.getPoint(tweenObj.t);

    // 카메라가 평면 내부로 제한되도록 설정
    const clampedX = THREE.MathUtils.clamp(currentPos.x, -roomWidth / 2 + 10, roomWidth / 2 - 10);
    const clampedZ = THREE.MathUtils.clamp(currentPos.z, -roomDepth / 2 + 10, roomDepth / 2 - 10);
    camera.position.set(clampedX, currentPos.y, clampedZ);

    // 다음 지점을 참조하여 자연스러운 시선 변경
    const lookAtT = tweenObj.t + 0.02 <= 1 ? tweenObj.t + 0.02 : 1; // 다음 지점 계산
    const lookAtPos = cameraPath.getPoint(lookAtT);
    camera.lookAt(lookAtPos);
  }
});

// --- 7. 창 크기 변경 시 반응형 처리 ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
