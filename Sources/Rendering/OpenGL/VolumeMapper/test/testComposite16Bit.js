import test      from 'tape-catch';
import testUtils from 'vtk.js/Sources/Testing/testUtils';

import vtkColorTransferFunction   from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkHttpDataSetReader       from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPiecewiseFunction  from 'vtk.js/Sources/Common/DataModel/PiecewiseFunction';
import vtkRenderWindow       from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor  from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkRenderer           from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkVolume             from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper       from 'vtk.js/Sources/Rendering/Core/VolumeMapper';

import baseline from './testComposite16Bit.png';

test.onlyIfWebGL('Test Composite Volume Rendering', (t) => {
  const gc = testUtils.createGarbageCollector(t);
  t.ok('rendering', 'vtkOpenGLVolumeMapper Composite16Bit');
  testUtils.keepDOM();

  // Create some control UI
  const container = document.querySelector('body');
  const renderWindowContainer = gc.registerDOMElement(document.createElement('div'));
  container.appendChild(renderWindowContainer);

  // create what we will view
  const renderWindow = gc.registerResource(vtkRenderWindow.newInstance());
  const renderer = gc.registerResource(vtkRenderer.newInstance());
  renderWindow.addRenderer(renderer);

  const actor = gc.registerResource(vtkVolume.newInstance());
  // renderer.addVolume(actor);

  const mapper = gc.registerResource(vtkVolumeMapper.newInstance());
  mapper.setSampleDistance(2.0);
  actor.setMapper(mapper);

  // create color and opacity transfer functions
  const ctfun = vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(200.0, 1.0, 1.0, 1.0);
  ctfun.addRGBPoint(2000.0, 0.0, 0.0, 0.0);
  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(200.0, 0.0);
  ofun.addPoint(1200.0, 0.2);
  ofun.addPoint(4000.0, 0.4);
  actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
  // actor.getProperty().setInterpolationTypeToNearest();
  // actor.getProperty().setInterpolationTypeToFastLinear();
  actor.getProperty().setInterpolationTypeToLinear();

  const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
  mapper.setImageSampleDistance(2.0);
  mapper.setInputConnection(reader.getOutputPort());

  // now create something to view it, in this case webgl
  const glwindow = gc.registerResource(vtkOpenGLRenderWindow.newInstance());
  glwindow.setContainer(renderWindowContainer);
  renderWindow.addView(glwindow);
  glwindow.setSize(400, 400);

  // Interactor
  const interactor = vtkRenderWindowInteractor.newInstance();
  interactor.setView(glwindow);
  interactor.initialize();
  interactor.bindEvents(renderWindowContainer);

  reader.setUrl(`${__BASE_PATH__}/Data/volume/headsq.vti`).then(() => {
    reader.loadData().then(() => {
      renderer.addVolume(actor);
      renderer.resetCamera();
      renderWindow.render();
      const image = glwindow.captureImage();
      testUtils.compareImages(image, [baseline],
        'Rendering/OpenGL/VolumeMapper/testComposite16Bit',
          t, 1.5, gc.releaseResources);
      });
  });
});
