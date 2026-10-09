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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    if(this.group){this.scene.remove(this.group);this.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
    this.project = p;
    this.group=new THREE.Group();this.group.name=p.title;this.objectMeshes=new Map();
    for(const object of p.objects){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(object.mesh.positions,3));g.setIndex(new THREE.BufferAttribute(object.mesh.indices,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({...object.material,side:THREE.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=object.title;mesh.userData={objectId:object.id,unit:'meter'};this.objectMeshes.set(object.id,mesh);this.group.add(mesh);}
    this.scene.add(this.group);this.setActiveObject(p.activeId);
    this.updateTransform();
    this.render();
  }
  setActiveObject(id){this.mesh=this.objectMeshes.get(id);if(this.selection){this.scene.remove(this.selection);this.selection.geometry.dispose();this.selection.material.dispose();}this.selection=new THREE.BoxHelper(this.mesh,'#b88b54');this.scene.add(this.selection);this.render();}
  updateTransform() {
    const p = this.project;
    for(const object of p.objects){const mesh=this.objectMeshes.get(object.id);mesh.position.fromArray(object.transform.position);mesh.rotation.set(...object.transform.rotation.map(x=>x*Math.PI/180));mesh.scale.fromArray(object.transform.scale);mesh.material.color.set(object.material.color);mesh.material.roughness=object.material.roughness;mesh.material.metalness=object.material.metalness;mesh.name=object.title;mesh.updateMatrixWorld(true);}
    this.selection?.update();
    this.render();
  }
  refresh() {
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    this.selection?.update();
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
    const hit = this.ray.intersectObject(this.group, true)[0];
    if (!hit) return null;
    const local = hit.object.worldToLocal(hit.point.clone());
    return {
      point: local.toArray(),
      normal: hit.face.normal.toArray(),
      world: hit.point,
      objectId:hit.object.userData.objectId,
      object:hit.object,
    };
  }
  cursor(hit, radius) {
    this.ring.visible = !!hit;
    if (hit) {
      this.ring.position.copy(hit.world);
      const n = new THREE.Vector3(...hit.normal)
        .applyNormalMatrix(
          new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld),
        )
        .normalize();
      this.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.ring.scale.setScalar(
        (radius * (hit.object.scale.x + hit.object.scale.y + hit.object.scale.z)) /
          3,
      );
    }
    this.render();
  }
  view(name,all=name==='isometric') {
    const box=new THREE.Box3().setFromObject(all?this.group:this.mesh);
    const target = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()).length()/2,
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
  target(values){if(!values.every(v=>Number.isFinite(v)&&Math.abs(v)<=100))throw Error('카메라 중심은 ±100m 범위입니다.');const next=new THREE.Vector3(...values),delta=next.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(next);this.controls.update();this.render();}
  pan(dx,dy){const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),distance=this.camera.position.distanceTo(this.controls.target)*.08,delta=right.multiplyScalar(dx*distance).add(up.multiplyScalar(dy*distance));this.target(this.controls.target.clone().add(delta).toArray().map(v=>Math.max(-100,Math.min(100,v))));}
  cutPlane(normal,offset,visible){if(this.cutHelper){this.scene.remove(this.cutHelper);this.cutHelper.geometry.dispose();this.cutHelper.material.dispose();this.cutHelper=null;}if(visible){const n=new THREE.Vector3(...normal).normalize(),box=new THREE.Box3().setFromObject(this.mesh),center=box.getCenter(new THREE.Vector3()),size=Math.max(box.getSize(new THREE.Vector3()).length()*1.2,.1);center.add(n.clone().multiplyScalar(offset-center.dot(n)));const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color:'#347eb1',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));mesh.position.copy(center);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);this.cutHelper=mesh;this.scene.add(mesh);}this.render();}
  async glb() {
    const mesh = this.group.clone(true);
    mesh.name = this.project.title;
    mesh.userData = { unit: "meter", application: "CLAY ROOM" };
    mesh.updateMatrixWorld(true);
    return new GLTFExporter().parseAsync(mesh, {
      binary: true,
      onlyVisible: true,
    });
  }
  stl() {
    const mesh = this.group.clone(true);
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
      ring = this.ring.visible,selection=this.selection.visible,cut=this.cutHelper?.visible;
    try {
      this.ring.visible = false;
      this.selection.visible=false;if(this.cutHelper)this.cutHelper.visible=false;
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
      this.selection.visible=selection;if(this.cutHelper)this.cutHelper.visible=cut;
      this.renderer.setPixelRatio(oldRatio);
      this.renderer.setSize(oldSize.x, oldSize.y, false);
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.render();
    }
  }
}
