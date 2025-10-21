import type {
  HyperFrameAdapter,
  HyperFrameAdapterContext,
  HyperFrameAdapterHandle,
  ThreeContext,
  ThreeLifecycleHandlers,
  ThreeSketchContext,
} from '../types';

function getThreeConstructors(): any {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }

  const THREE = (window as any).THREE;

  if (typeof THREE !== 'object') {
    throw new Error('[hyper-frame] THREE not found on window. Make sure to import and expose Three.js on window in your sketch.');
  }

  return THREE;
}

function createSketchContext(context: HyperFrameAdapterContext, threeContext: ThreeContext): ThreeSketchContext {
  return {
    params: context.params,
    controls: context.controls,
    getThreeContext: () => threeContext,
  };
}

export const threeAdapter: HyperFrameAdapter<ThreeLifecycleHandlers> = {
  id: 'three',
  async start(handlers: ThreeLifecycleHandlers, context: HyperFrameAdapterContext): Promise<HyperFrameAdapterHandle> {
    if (typeof document === 'undefined') {
      throw new Error('mountThreeSketch cannot run outside a browser environment');
    }

    const THREE = getThreeConstructors();
    const mountOptions = (context.mountOptions || {}) as Record<string, any>;
    const cameraOpts = mountOptions.camera || {};
    const rendererOpts = mountOptions.renderer || {};
    const container = context.mount.container;

    const scene = new THREE.Scene();

    const cameraType = cameraOpts.type || 'perspective';
    let camera: any;

    if (cameraType === 'perspective') {
      camera = new THREE.PerspectiveCamera(
        cameraOpts.fov || 75,
        container.clientWidth / (container.clientHeight || 1),
        cameraOpts.near || 0.1,
        cameraOpts.far || 1000,
      );
    } else {
      const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight || 1);
      camera = new THREE.OrthographicCamera(
        -aspect,
        aspect,
        1,
        -1,
        cameraOpts.near || 0.1,
        cameraOpts.far || 1000,
      );
    }

    if (cameraOpts.position) {
      camera.position.set(...cameraOpts.position);
    } else {
      camera.position.z = 5;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: rendererOpts.antialias !== false,
      alpha: Boolean(rendererOpts.alpha),
      preserveDrawingBuffer: Boolean(rendererOpts.preserveDrawingBuffer),
    });

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    let orbitControls: any = null;
    if (mountOptions.orbitControls) {
      const OrbitControls = (window as any).OrbitControls || THREE.OrbitControls;
      if (OrbitControls) {
        orbitControls = new OrbitControls(camera, renderer.domElement);
      } else {
        console.warn('[hyper-frame] OrbitControls not found. Make sure to import and expose it on window.');
      }
    }

    const threeContext: ThreeContext = {
      scene,
      camera,
      renderer,
      controls: orbitControls || undefined,
    };

    let currentHandlers: ThreeLifecycleHandlers = { ...handlers };
    let animationId: number | null = null;
    let isAnimating = false;

    const sketchContext = createSketchContext(context, threeContext);

    function handleResize() {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const aspect = width / height;
        camera.left = -aspect;
        camera.right = aspect;
        camera.updateProjectionMatrix();
      }

      renderer.setSize(width, height);

      currentHandlers.resize?.(threeContext, sketchContext);
    }

    window.addEventListener('resize', handleResize);

    function animate() {
      if (!isAnimating) return;

      animationId = requestAnimationFrame(animate);

      if (orbitControls && typeof orbitControls.update === 'function') {
        orbitControls.update();
      }

      currentHandlers.animate?.(threeContext, sketchContext);

      renderer.render(scene, camera);
    }

    currentHandlers.setup?.(threeContext, sketchContext);

    if (typeof mountOptions.onReady === 'function') {
      mountOptions.onReady(threeContext);
    }

    function startAnimation() {
      if (!isAnimating) {
        isAnimating = true;
        animate();
      }
    }

    function stopAnimation() {
      isAnimating = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }

    startAnimation();

    return {
      destroy() {
        stopAnimation();
        window.removeEventListener('resize', handleResize);

        currentHandlers.dispose?.();

        if (orbitControls && typeof orbitControls.dispose === 'function') {
          orbitControls.dispose();
        }

        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      },
      setHandlers(nextHandlers: Record<string, any>) {
        currentHandlers = { ...nextHandlers } as ThreeLifecycleHandlers;
      },
      getInstance() {
        return threeContext;
      },
    };
  },
};
