import {
  THREE,
  OrbitControls,
  GLTFExporter,
  STLExporter,
} from "../vendor/sculpt.js";
export class Viewport {
  constructor(host, project) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#eee8e2");
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.append(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute(
      "aria-label",
      "3D 조각 화면. 보기 도구에서 드래그로 회전, 휠로 확대",
    );
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
    this.camera.position.set(3, 1.7, 4);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener("change", () => this.render());
    this.scene.add(new THREE.HemisphereLight("#fff8ed", "#7c6a60", 2.4));
    const key = new THREE.DirectionalLight("#fff4e5", 3.5);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.001;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#dae5ff", 1.5);
    fill.position.set(5, 2, -4);
    this.scene.add(fill);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.13 }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1.34;
    plane.receiveShadow = true;
    this.scene.add(plane);
    this.grid = new THREE.GridHelper(10, 40, "#c3b8ac", "#ded4ca");
    this.grid.position.y = -1.335;
    this.scene.add(this.grid);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 64),
      new THREE.MeshBasicMaterial({
        color: "#765138",
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.ring.visible = false;
    this.ring.renderOrder = 10;
    this.scene.add(this.ring);
    this.ray = new THREE.Raycaster();
    this.setProject(project);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }
  setProject(p) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.project = p;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p.mesh.positions, 3));
    g.setIndex(new THREE.BufferAttribute(p.mesh.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    this.mesh = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({ ...p.material, side: THREE.DoubleSide }),
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = p.title;
    this.scene.add(this.mesh);
    this.updateTransform();
    this.render();
  }
  updateTransform() {
    const p = this.project;
    this.mesh.position.fromArray(p.transform.position);
    this.mesh.rotation.set(
      ...p.transform.rotation.map((x) => (x * Math.PI) / 180),
    );
    this.mesh.scale.fromArray(p.transform.scale);
    this.mesh.material.color.set(p.material.color);
    this.mesh.material.roughness = p.material.roughness;
    this.mesh.material.metalness = p.material.metalness;
    this.mesh.updateMatrixWorld(true);
    this.render();
  }
  refresh() {
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    this.render();
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  pick(x, y) {
    const b = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((x - b.left) / b.width) * 2 - 1,
        (-(y - b.top) / b.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = this.ray.intersectObject(this.mesh, false)[0];
    if (!hit) return null;
    const local = this.mesh.worldToLocal(hit.point.clone());
    return {
      point: local.toArray(),
      normal: hit.face.normal.toArray(),
      world: hit.point,
    };
  }
  cursor(hit, radius) {
    this.ring.visible = !!hit;
    if (hit) {
      this.ring.position.copy(hit.world);
      const n = new THREE.Vector3(...hit.normal)
        .applyNormalMatrix(
          new THREE.Matrix3().getNormalMatrix(this.mesh.matrixWorld),
        )
        .normalize();
      this.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.ring.scale.setScalar(
        (radius * (this.mesh.scale.x + this.mesh.scale.y + this.mesh.scale.z)) /
          3,
      );
    }
    this.render();
  }
  view(name) {
    const target = this.mesh.position.clone(),
      size =
        this.mesh.geometry.boundingSphere.radius *
        Math.max(...this.mesh.scale.toArray()),
      distance = Math.max(0.8, size * 4.4),
      dirs = {
        front: [0, 0, 1],
        side: [1, 0, 0],
        top: [0, 0.9999, 0.001],
        isometric: [0.65, 0.35, 1],
      };
    this.controls.target.copy(target);
    this.camera.position.copy(
      new THREE.Vector3(...dirs[name])
        .normalize()
        .multiplyScalar(distance)
        .add(target),
    );
    this.controls.update();
    this.render();
  }
  async glb() {
    const mesh = this.mesh.clone();
    mesh.name = this.project.title;
    mesh.userData = { unit: "meter", application: "CLAY ROOM" };
    mesh.updateMatrixWorld(true);
    return new GLTFExporter().parseAsync(mesh, {
      binary: true,
      onlyVisible: true,
    });
  }
  stl() {
    const mesh = this.mesh.clone();
    mesh.scale.multiplyScalar(1000);
    mesh.position.multiplyScalar(1000);
    mesh.updateMatrixWorld(true);
    const raw = new STLExporter().parse(mesh, { binary: true });
    const v = raw instanceof DataView ? raw : new DataView(raw);
    const header = new TextEncoder().encode(
      "CLAY ROOM | Coordinates in millimeters",
    );
    for (let i = 0; i < 80; i++) v.setUint8(i, header[i] ?? 0);
    return v.buffer;
  }
  async png(size) {
    if (!Number.isInteger(size) || size < 512 || size > 4096)
      throw Error("PNG 출력은 512–4096px입니다.");
    const gl = this.renderer.getContext();
    if (size > gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
      throw Error("이 기기의 최대 출력 크기를 넘습니다.");
    const oldSize = this.renderer.getSize(new THREE.Vector2()),
      oldRatio = this.renderer.getPixelRatio(),
      aspect = this.camera.aspect,
      ring = this.ring.visible;
    try {
      this.ring.visible = false;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(size, size, false);
      this.camera.aspect = 1;
      this.camera.updateProjectionMatrix();
      this.render();
      const blob = await new Promise((resolve) =>
        this.canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw Error("PNG 출력을 생성하지 못했습니다.");
      return blob;
    } finally {
      this.ring.visible = ring;
      this.renderer.setPixelRatio(oldRatio);
      this.renderer.setSize(oldSize.x, oldSize.y, false);
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.render();
    }
  }
}
