// 3D Railway Infrastructure Digital Twin (Three.js WebGL)
// Visualizes parallel tracks, OHE catenary, signals, moving trains, maintenance blocks, and section inspector

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Eye, 
  Wrench, 
  Train as TrainIcon,
  Zap,
  Radio,
  Sliders
} from 'lucide-react';

interface DigitalTwin3DProps {
  onOpenSectionDrawer: (sectionId: string) => void;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({ onOpenSectionDrawer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, toggleLayer, selectSection } = useSamnvayStore();

  const [hoveredSection, setHoveredSection] = useState<{
    id: string;
    name: string;
    kmRange: string;
    trafficDensity: string;
    status: string;
    x: number;
    y: number;
  } | null>(null);

  const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);

  // References for Three.js lifecycle
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupTracksRef = useRef<THREE.Group | null>(null);
  const groupTrainsRef = useRef<THREE.Group | null>(null);
  const groupSignalsRef = useRef<THREE.Group | null>(null);
  const groupOheRef = useRef<THREE.Group | null>(null);
  const groupBlocksRef = useRef<THREE.Group | null>(null);
  const interactiveSectionsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07111F); // Primary Background #07111F
    scene.fog = new THREE.FogExp2(0x07111F, 0.004);
    sceneRef.current = scene;

    // 2. CAMERA (Subtle perspective extending into distance)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1200);
    camera.position.set(0, 36, 95);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. LIGHTING (Dark command center aesthetic with metallic glints)
    const ambientLight = new THREE.AmbientLight(0xdde6ed, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(40, 80, 50);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const cyanAccentLight = new THREE.DirectionalLight(0x22d3ee, 0.45);
    cyanAccentLight.position.set(-60, -20, -40);
    scene.add(cyanAccentLight);

    // 5. GROUND TERRAIN & COMMAND-CENTER GRID
    const groundGeo = new THREE.PlaneGeometry(500, 240);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b1726,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    scene.add(ground);

    const grid = new THREE.GridHelper(450, 90, 0x1a2e46, 0x101f31);
    grid.position.y = -0.55;
    scene.add(grid);

    // 6. LAYER GROUPS
    const groupTracks = new THREE.Group();
    const groupTrains = new THREE.Group();
    const groupSignals = new THREE.Group();
    const groupOhe = new THREE.Group();
    const groupBlocks = new THREE.Group();

    groupTracksRef.current = groupTracks;
    groupTrainsRef.current = groupTrains;
    groupSignalsRef.current = groupSignals;
    groupOheRef.current = groupOhe;
    groupBlocksRef.current = groupBlocks;

    scene.add(groupTracks);
    scene.add(groupTrains);
    scene.add(groupSignals);
    scene.add(groupOhe);
    scene.add(groupBlocks);

    // 7. BUILD PARALLEL TRACKS (UP Main: Z = -5, DN Main: Z = 5, Loop Line: Z = 14)
    const trackConfigs = [
      { id: 'UP', z: -5, label: 'UP MAIN' },
      { id: 'DN', z: 5, label: 'DN MAIN' },
      { id: 'LOOP', z: 14, label: 'LOOP LINE' },
    ];

    const interactiveSections: THREE.Mesh[] = [];

    trackConfigs.forEach(tc => {
      // Ballast bed
      const ballastGeo = new THREE.BoxGeometry(400, 0.35, 4.4);
      const ballastMat = new THREE.MeshStandardMaterial({ color: 0x182436, roughness: 0.95 });
      const ballast = new THREE.Mesh(ballastGeo, ballastMat);
      ballast.position.set(0, -0.2, tc.z);
      groupTracks.add(ballast);

      // Steel Rails (2 per track, metallic finish)
      [-1.1, 1.1].forEach(offset => {
        const railGeo = new THREE.BoxGeometry(400, 0.3, 0.12);
        const railMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.85,
          roughness: 0.2,
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, 0.08, tc.z + offset);
        groupTracks.add(rail);
      });

      // Concrete Sleepers
      const sleeperGeo = new THREE.BoxGeometry(0.45, 0.2, 3.2);
      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const sleeperCount = 140;
      const instancedSleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < sleeperCount; i++) {
        dummy.position.set(-195 + i * 2.8, -0.05, tc.z);
        dummy.updateMatrix();
        instancedSleepers.setMatrixAt(i, dummy.matrix);
      }
      instancedSleepers.instanceMatrix.needsUpdate = true;
      groupTracks.add(instancedSleepers);
    });

    // 8. CORRIDOR SECTIONS & INTERACTIVE HITBOXES (C1, C2, C3)
    const sections = [
      { id: 'C1', name: 'SECTION C1', kmRange: 'KM 214/3 – KM 217/8', trafficDensity: 'HIGH', status: 'Available', x: -100 },
      { id: 'C2', name: 'SECTION C2', kmRange: 'KM 218/0 – KM 224/5', trafficDensity: 'MEDIUM', status: 'Available', x: 0 },
      { id: 'C3', name: 'SECTION C3', kmRange: 'KM 225/0 – KM 231/2', trafficDensity: 'HIGH', status: 'Caution', x: 100 },
    ];

    sections.forEach(sec => {
      // Invisible or subtle boundary box for raycasting
      const hitGeo = new THREE.BoxGeometry(90, 4, 25);
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.04,
      });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.set(sec.x, 1.5, 5);
      hitBox.userData = sec;
      interactiveSections.push(hitBox);
      groupTracks.add(hitBox);

      // Section boundary vertical marker post
      const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sec.x - 45, 3, -9);
      groupTracks.add(post);

      // Section Station Platform
      const platGeo = new THREE.BoxGeometry(32, 0.7, 4);
      const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const platform = new THREE.Mesh(platGeo, platMat);
      platform.position.set(sec.x, 0.35, -8.5);
      groupTracks.add(platform);
    });

    interactiveSectionsRef.current = interactiveSections;

    // 9. SIGNALS (Green = clear, Amber = caution, Red = blocked)
    const signalData = [
      { x: -130, z: -8, aspect: 'GREEN' },
      { x: -70, z: -8, aspect: 'GREEN' },
      { x: -10, z: 8, aspect: 'AMBER' },
      { x: 60, z: -8, aspect: 'RED' }, // Red near maintenance zone C3
      { x: 120, z: 8, aspect: 'GREEN' },
    ];

    signalData.forEach(sig => {
      const sigGroup = new THREE.Group();
      sigGroup.position.set(sig.x, 0, sig.z);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
      );
      mast.position.y = 2.25;
      sigGroup.add(mast);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.8, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x020617 })
      );
      housing.position.y = 4.2;
      sigGroup.add(housing);

      let aspectColor = 0x27c77a; // Signal Green
      if (sig.aspect === 'AMBER') aspectColor = 0xf4b740;
      else if (sig.aspect === 'RED') aspectColor = 0xd83a3a;

      const lamp = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 16),
        new THREE.MeshBasicMaterial({ color: aspectColor })
      );
      lamp.position.set(0, 4.2, 0.21);
      sigGroup.add(lamp);

      groupSignals.add(sigGroup);
    });

    // 10. OHE CATENARY WIRE & PORTAL MASTS
    for (let x = -180; x <= 180; x += 30) {
      const mast1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 7.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
      );
      mast1.position.set(x, 3.75, -9);
      groupOhe.add(mast1);

      const crossArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 26),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      crossArm.position.set(x, 7.2, 4);
      groupOhe.add(crossArm);
    }

    // Continuous contact wires
    [-5, 5].forEach(z => {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 400, 4),
        new THREE.MeshBasicMaterial({ color: 0xd97706 }) // Copper contact wire
      );
      wire.rotation.z = Math.PI / 2;
      wire.position.set(0, 6.0, z);
      groupOhe.add(wire);
    });

    // 11. MAINTENANCE BLOCKS HIGHLIGHTED ON TRACK
    // Section C3 active block (P.Way BR-1023)
    const block1Geo = new THREE.BoxGeometry(35, 0.15, 3.8);
    const block1Mat = new THREE.MeshBasicMaterial({
      color: 0xf4b740, // Amber maintenance highlight
      transparent: true,
      opacity: 0.5,
    });
    const block1 = new THREE.Mesh(block1Geo, block1Mat);
    block1.position.set(100, 0.15, -5);
    groupBlocks.add(block1);

    // Section C1 planned block (TRD BR-1026)
    const block2Geo = new THREE.BoxGeometry(30, 0.15, 3.8);
    const block2Mat = new THREE.MeshBasicMaterial({
      color: 0xd83a3a, // Red / Conflict block
      transparent: true,
      opacity: 0.45,
    });
    const block2 = new THREE.Mesh(block2Geo, block2Mat);
    block2.position.set(-100, 0.15, -5);
    groupBlocks.add(block2);

    // 12. ANIMATED 3D TRAINS
    const trains: { mesh: THREE.Group; speed: number; direction: number; z: number }[] = [];

    // Train 1: Karnataka Express on UP main
    const train1 = new THREE.Group();
    const loco1 = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xd83a3a, roughness: 0.4 }) // Red WAP-7
    );
    loco1.position.y = 2.0;
    train1.add(loco1);
    for (let c = 1; c <= 4; c++) {
      const coach = new THREE.Mesh(
        new THREE.BoxGeometry(10, 3.0, 2.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
      );
      coach.position.set(-c * 11, 1.9, 0);
      train1.add(coach);
    }
    train1.position.set(-40, 0, -5);
    groupTrains.add(train1);
    trains.push({ mesh: train1, speed: 0.15, direction: 1, z: -5 });

    // Train 2: Vande Bharat on DN main
    const train2 = new THREE.Group();
    const loco2 = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.3 }) // Cyan/White livery
    );
    loco2.position.y = 2.0;
    train2.add(loco2);
    for (let c = 1; c <= 3; c++) {
      const coach = new THREE.Mesh(
        new THREE.BoxGeometry(10, 3.0, 2.6),
        new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.4 })
      );
      coach.position.set(c * 11, 1.9, 0);
      train2.add(coach);
    }
    train2.position.set(50, 0, 5);
    groupTrains.add(train2);
    trains.push({ mesh: train2, speed: 0.22, direction: -1, z: 5 });

    // 13. MOUSE INTERACTION & RAYCASTING FOR SECTION INSPECTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveSections);

      if (intersects.length > 0) {
        const data = intersects[0].object.userData as any;
        setHoveredSection({
          id: data.id,
          name: data.name,
          kmRange: data.kmRange,
          trafficDensity: data.trafficDensity,
          status: data.status,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      } else {
        setHoveredSection(null);
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveSections);
      if (intersects.length > 0) {
        const data = intersects[0].object.userData as any;
        selectSection(data.id);
        onOpenSectionDrawer(data.id);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // 14. ANIMATION LOOP
    let reqId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Slowly move trains along track
      trains.forEach(t => {
        t.mesh.position.x += t.speed * t.direction;
        if (t.mesh.position.x > 180) t.mesh.position.x = -180;
        if (t.mesh.position.x < -180) t.mesh.position.x = 180;
      });

      // Gentle pulse on maintenance block highlights
      const elapsed = clock.getElapsedTime();
      block1Mat.opacity = 0.35 + Math.sin(elapsed * 3) * 0.15;
      block2Mat.opacity = 0.35 + Math.sin(elapsed * 4) * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  // UPDATE LAYER VISIBILITY BASED ON STORE
  useEffect(() => {
    if (groupTracksRef.current) groupTracksRef.current.visible = state.twinLayers.tracks;
    if (groupTrainsRef.current) groupTrainsRef.current.visible = state.twinLayers.trains;
    if (groupSignalsRef.current) groupSignalsRef.current.visible = state.twinLayers.signals;
    if (groupOheRef.current) groupOheRef.current.visible = state.twinLayers.ohe;
    if (groupBlocksRef.current) groupBlocksRef.current.visible = state.twinLayers.maintenanceBlocks;
  }, [state.twinLayers]);

  // RESET VIEW FUNCTION
  const handleResetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 36, 95);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="relative w-full h-full bg-samnvay-bg rounded-xl border border-samnvay-border overflow-hidden">
      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Top Left: Digital Twin Telemetry Bar */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-samnvay-secondary/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-samnvay-border text-xs font-mono shadow-xl">
        <span className={`w-2 h-2 rounded-full ${state.liveData.source === 'LIVE' ? 'bg-emerald-400 animate-ping' : 'bg-samnvay-cyan animate-pulse'}`} />
        <span className="text-samnvay-textSecondary font-bold">DIGITAL TWIN:</span>
        <span className="text-samnvay-cyan">BZA–GNT–TEL</span>
        <span className="text-samnvay-textMuted">|</span>
        <span className="text-emerald-400 text-[11px]">INFRA: Infrastructure Master</span>
        <span className="text-samnvay-textMuted">|</span>
        <span className="text-cyan-300 text-[11px]">GIS: OpenRailwayMap (Supplementary Geometry)</span>
        <span className="text-samnvay-textMuted">|</span>
        <span className={state.liveData.source === 'LIVE' ? 'text-emerald-400 font-bold text-[11px]' : state.liveData.source === 'UNAVAILABLE' ? 'text-red-400 font-bold text-[11px]' : 'text-samnvay-amber font-bold text-[11px]'}>
          {state.liveData.source === 'LIVE' ? 'TRAINS: RailRadar™ LIVE' : state.liveData.source === 'UNAVAILABLE' ? 'TRAINS: LIVE DATA UNAVAILABLE' : 'TRAINS: DEMO / SIMULATED'}
        </span>
      </div>

      {/* Floating Section Tooltip on Hover */}
      {hoveredSection && (
        <div
          style={{ left: `${hoveredSection.x + 12}px`, top: `${hoveredSection.y - 45}px` }}
          className="absolute z-30 pointer-events-none bg-samnvay-elevated/95 backdrop-blur-md border border-samnvay-cyan/60 rounded-lg p-2.5 text-xs font-mono shadow-2xl min-w-[200px]"
        >
          <div className="flex items-center justify-between border-b border-samnvay-border pb-1 mb-1">
            <span className="font-bold text-samnvay-cyan">{hoveredSection.name}</span>
            <span className={`text-[10px] px-1.5 rounded font-bold ${
              hoveredSection.status === 'Available' ? 'bg-samnvay-green/20 text-samnvay-green' : 'bg-samnvay-amber/20 text-samnvay-amber'
            }`}>
              {hoveredSection.status}
            </span>
          </div>
          <div className="text-[11px] text-samnvay-textSecondary">{hoveredSection.kmRange}</div>
          <div className="text-[10px] text-samnvay-textMuted mt-0.5">
            Traffic: <span className="text-samnvay-textPrimary font-bold">{hoveredSection.trafficDensity}</span>
          </div>
          <div className="text-[9px] text-samnvay-cyan/80 mt-1">Click to inspect section details</div>
        </div>
      )}

      {/* Floating Operational Labels */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
        <div className="bg-samnvay-surface/90 backdrop-blur-sm px-2.5 py-1 rounded border border-samnvay-border text-[11px] font-mono text-samnvay-textSecondary">
          C1 | SEC-04
        </div>
        <div className="bg-samnvay-amber/20 backdrop-blur-sm px-2.5 py-1 rounded border border-samnvay-amber/50 text-[11px] font-mono text-samnvay-amber font-bold flex items-center space-x-1">
          <Wrench className="w-3 h-3" />
          <span>BLOCK 02 (P.WAY)</span>
        </div>
        <div className="bg-samnvay-red/20 backdrop-blur-sm px-2.5 py-1 rounded border border-samnvay-red/50 text-[11px] font-mono text-samnvay-red font-bold">
          TRD ACTIVE
        </div>
      </div>

      {/* Top Right: View Controls & Layer Toggles */}
      <div className="absolute top-3 right-3 flex items-center space-x-2">
        {/* Layer Controls Button */}
        <div className="relative">
          <button
            onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
            className="flex items-center space-x-1.5 bg-samnvay-surface/90 hover:bg-samnvay-elevated backdrop-blur-md px-3 py-1.5 rounded-lg border border-samnvay-border text-xs font-mono text-samnvay-textSecondary hover:text-samnvay-textPrimary shadow-lg transition"
          >
            <Layers className="w-3.5 h-3.5 text-samnvay-cyan" />
            <span>Layers</span>
          </button>

          {isLayerControlOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-samnvay-elevated border border-samnvay-borderLight rounded-xl p-3 shadow-2xl z-40 space-y-2 text-xs font-mono">
              <div className="text-[10px] text-samnvay-textMuted uppercase font-bold tracking-wider border-b border-samnvay-border pb-1">
                Display Layers
              </div>
              <label className="flex items-center space-x-2 cursor-pointer text-samnvay-textSecondary hover:text-samnvay-textPrimary">
                <input
                  type="checkbox"
                  checked={state.twinLayers.tracks}
                  onChange={() => toggleLayer('tracks')}
                  className="accent-samnvay-cyan rounded"
                />
                <span>Tracks</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-samnvay-textSecondary hover:text-samnvay-textPrimary">
                <input
                  type="checkbox"
                  checked={state.twinLayers.trains}
                  onChange={() => toggleLayer('trains')}
                  className="accent-samnvay-cyan rounded"
                />
                <span>Trains</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-samnvay-textSecondary hover:text-samnvay-textPrimary">
                <input
                  type="checkbox"
                  checked={state.twinLayers.signals}
                  onChange={() => toggleLayer('signals')}
                  className="accent-samnvay-cyan rounded"
                />
                <span>Signals</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-samnvay-textSecondary hover:text-samnvay-textPrimary">
                <input
                  type="checkbox"
                  checked={state.twinLayers.ohe}
                  onChange={() => toggleLayer('ohe')}
                  className="accent-samnvay-cyan rounded"
                />
                <span>OHE</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-samnvay-textSecondary hover:text-samnvay-textPrimary">
                <input
                  type="checkbox"
                  checked={state.twinLayers.maintenanceBlocks}
                  onChange={() => toggleLayer('maintenanceBlocks')}
                  className="accent-samnvay-cyan rounded"
                />
                <span>Maintenance Blocks</span>
              </label>
            </div>
          )}
        </div>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          title="Reset Camera View"
          className="p-1.5 bg-samnvay-surface/90 hover:bg-samnvay-elevated backdrop-blur-md rounded-lg border border-samnvay-border text-samnvay-textSecondary hover:text-samnvay-textPrimary shadow-lg transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
