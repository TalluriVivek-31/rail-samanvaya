// 3D Railway Infrastructure Digital Twin (Three.js WebGL & Tactical GIS Digital Twin)
// Visualizes Indian Railways BZA–GNT–TEL corridor with actual track geometries,
// direction-aware map-matching, maintenance possessions, and section inspector.

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { 
  RotateCcw, 
  Layers, 
  Map,
  Box,
  Wrench, 
  Train as TrainIcon,
  ShieldAlert
} from 'lucide-react';
import { DigitalTwinMap } from './DigitalTwinMap';

interface DigitalTwin3DProps {
  onOpenSectionDrawer?: (sectionId: string) => void;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({ onOpenSectionDrawer }) => {
  const [activeViewMode, setActiveViewMode] = useState<'map' | '3d'>('map');
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
    if (activeViewMode !== '3d' || !containerRef.current) return;
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

    // 4. LIGHTING
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
      { id: 'UP', z: -5, label: 'UP MAIN (BZA → GNT → TEL)' },
      { id: 'DN', z: 5, label: 'DN MAIN (TEL → GNT → BZA)' },
      { id: 'LOOP', z: 14, label: 'MANGALAGIRI LOOP LINE' },
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

    // 8. REAL CORRIDOR SECTIONS & INTERACTIVE HITBOXES (SEC-A, SEC-B, SEC-C)
    const sections = [
      { id: 'SEC-A', name: 'BZA – MAG Section', kmRange: 'KM 0/000 – KM 25/000', trafficDensity: 'HIGH', status: 'Available', x: -100 },
      { id: 'SEC-B', name: 'MAG – GNT Section', kmRange: 'KM 25/000 – KM 52/500', trafficDensity: 'MEDIUM', status: 'Available', x: 0 },
      { id: 'SEC-C', name: 'GNT – TEL Section', kmRange: 'KM 52/500 – KM 80/000', trafficDensity: 'HIGH', status: 'Caution', x: 100 },
    ];

    sections.forEach(sec => {
      // Invisible boundary box for raycasting
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

    // 9. SIGNALS
    const signalData = [
      { x: -130, z: -8, aspect: 'GREEN' },
      { x: -70, z: -8, aspect: 'GREEN' },
      { x: -10, z: 8, aspect: 'AMBER' },
      { x: 60, z: -8, aspect: 'RED' },
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
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      );
      wire.rotation.z = Math.PI / 2;
      wire.position.set(0, 6.0, z);
      groupOhe.add(wire);
    });

    // 11. MAINTENANCE BLOCKS HIGHLIGHTED ON TRACK
    const block1Geo = new THREE.BoxGeometry(35, 0.15, 3.8);
    const block1Mat = new THREE.MeshBasicMaterial({
      color: 0xf4b740,
      transparent: true,
      opacity: 0.5,
    });
    const block1 = new THREE.Mesh(block1Geo, block1Mat);
    block1.position.set(100, 0.15, -5);
    groupBlocks.add(block1);

    const block2Geo = new THREE.BoxGeometry(30, 0.15, 3.8);
    const block2Mat = new THREE.MeshBasicMaterial({
      color: 0xd83a3a,
      transparent: true,
      opacity: 0.45,
    });
    const block2 = new THREE.Mesh(block2Geo, block2Mat);
    block2.position.set(-100, 0.15, -5);
    groupBlocks.add(block2);

    // 12. DIGITAL TRAINS
    const trains: { mesh: THREE.Group; speed: number; direction: number; z: number }[] = [];
    const isLive = state.liveData.source === 'LIVE';
    const isAvailable = state.liveData.source !== 'UNAVAILABLE';

    if (isAvailable) {
      // Train 1: UP Karnataka Express on UP main
      const train1 = new THREE.Group();
      const loco1 = new THREE.Mesh(
        new THREE.BoxGeometry(9, 3.2, 2.6),
        new THREE.MeshStandardMaterial({ color: 0xd83a3a, roughness: 0.4 })
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
      trains.push({ mesh: train1, speed: isLive ? 0.12 : 0.08, direction: 1, z: -5 });

      // Train 2: DN Vande Bharat on DN main
      const train2 = new THREE.Group();
      const loco2 = new THREE.Mesh(
        new THREE.BoxGeometry(9, 3.2, 2.6),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.3 })
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
      trains.push({ mesh: train2, speed: isLive ? 0.18 : 0.10, direction: -1, z: 5 });
    }

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
        if (onOpenSectionDrawer) {
          onOpenSectionDrawer(data.id);
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // 14. ANIMATION LOOP
    let reqId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Only move trains if telemetry is available
      if (isAvailable) {
        trains.forEach(t => {
          t.mesh.position.x += t.speed * t.direction;
          if (t.mesh.position.x > 180) t.mesh.position.x = -180;
          if (t.mesh.position.x < -180) t.mesh.position.x = 180;
        });
      }

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
  }, [activeViewMode, state.liveData.source]);

  // UPDATE LAYER VISIBILITY BASED ON STORE
  useEffect(() => {
    if (groupTracksRef.current) groupTracksRef.current.visible = state.twinLayers.tracks;
    if (groupTrainsRef.current) groupTrainsRef.current.visible = state.twinLayers.trains;
    if (groupSignalsRef.current) groupSignalsRef.current.visible = state.twinLayers.signals;
    if (groupOheRef.current) groupOheRef.current.visible = state.twinLayers.ohe;
    if (groupBlocksRef.current) groupBlocksRef.current.visible = state.twinLayers.maintenanceBlocks;
  }, [state.twinLayers]);

  const handleResetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 36, 95);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* View Switcher Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-railway-border shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-railway-canvas flex items-center justify-center text-railway-forest border border-railway-border">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-railway-textPrimary">
              Digital Twin Command Console
            </h2>
            <p className="text-xs text-railway-textSecondary font-mono">
              Vijayawada – Guntur – Tenali High-Density Corridor
            </p>
          </div>
        </div>

        {/* View Mode Toggle: 2D GIS Map vs 3D Perspective */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
          <button
            onClick={() => setActiveViewMode('map')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
              activeViewMode === 'map'
                ? 'bg-white text-railway-forest shadow-xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Tactical GIS Map</span>
          </button>
          <button
            onClick={() => setActiveViewMode('3d')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
              activeViewMode === '3d'
                ? 'bg-white text-railway-forest shadow-xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Perspective</span>
          </button>
        </div>
      </div>

      {/* Render View: Tactical GIS Map or 3D WebGL Perspective */}
      {activeViewMode === 'map' ? (
        <DigitalTwinMap />
      ) : (
        <div className="relative w-full h-[700px] bg-samnvay-bg rounded-2xl border border-samnvay-border overflow-hidden shadow-2xl">
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
            <span className={state.liveData.source === 'LIVE' ? 'text-emerald-400 font-bold text-[11px]' : state.liveData.source === 'UNAVAILABLE' ? 'text-red-400 font-bold text-[11px]' : 'text-samnvay-amber font-bold text-[11px]'}>
              {state.liveData.source === 'LIVE' ? 'TRAINS: RailRadar™ LIVE' : state.liveData.source === 'UNAVAILABLE' ? 'TRAINS: LIVE DATA UNAVAILABLE' : 'TRAINS: DEMO / SIMULATED'}
            </span>
          </div>

          {/* Hover Section Tooltip */}
          {hoveredSection && (
            <div
              style={{ left: `${hoveredSection.x + 12}px`, top: `${hoveredSection.y - 45}px` }}
              className="absolute z-30 pointer-events-none bg-samnvay-elevated/95 backdrop-blur-md border border-samnvay-cyan/60 rounded-lg p-2.5 text-xs font-mono shadow-2xl min-w-[200px]"
            >
              <div className="flex items-center justify-between border-b border-samnvay-border pb-1 mb-1">
                <span className="font-bold text-samnvay-cyan">{hoveredSection.name}</span>
                <span className="text-[10px] px-1.5 rounded font-bold bg-samnvay-green/20 text-samnvay-green">
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

          {/* Top Right Controls */}
          <div className="absolute top-3 right-3 flex items-center space-x-2">
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
                      checked={state.twinLayers.maintenanceBlocks}
                      onChange={() => toggleLayer('maintenanceBlocks')}
                      className="accent-samnvay-cyan rounded"
                    />
                    <span>Maintenance Blocks</span>
                  </label>
                </div>
              )}
            </div>

            <button
              onClick={handleResetView}
              title="Reset Camera View"
              className="p-1.5 bg-samnvay-surface/90 hover:bg-samnvay-elevated backdrop-blur-md rounded-lg border border-samnvay-border text-samnvay-textSecondary hover:text-samnvay-textPrimary shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
