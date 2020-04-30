import 'vtk.js/Sources/favicon';

import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkSplineWidget from 'vtk.js/Sources/Widgets/Widgets3D/SplineWidget';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';

import controlPanel from './controlPanel.html';

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// ----------------------------------------------------------------------------
// Widget manager
// ----------------------------------------------------------------------------

const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);

const widget = vtkSplineWidget.newInstance();

const widgetRepresentation = widgetManager.addWidget(widget);

renderer.resetCamera();

// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------

fullScreenRenderer.addController(controlPanel);

const resolutionInput = document.querySelector('.resolution');
const onResolutionChanged = () => {
  widgetRepresentation.setResolution(resolutionInput.value);
  renderWindow.render();
};
resolutionInput.addEventListener('input', onResolutionChanged);
onResolutionChanged();

const handleSizeInput = document.querySelector('.handleSize');
const onHandleSizeChanged = () => {
  widgetRepresentation.setHandleSizeInPixels(handleSizeInput.value);
  renderWindow.render();
};
handleSizeInput.addEventListener('input', onHandleSizeChanged);
onHandleSizeChanged();

const allowFreehandCheckBox = document.querySelector('.allowFreehand');
const onFreehandEnabledChanged = () => {
  widgetRepresentation.setAllowFreehand(allowFreehandCheckBox.checked);
};
allowFreehandCheckBox.addEventListener('click', onFreehandEnabledChanged);
onFreehandEnabledChanged();

const freehandDistanceInput = document.querySelector('.freehandDistance');
const onFreehandDistanceChanged = () => {
  widgetRepresentation.setFreehandMinDistance(freehandDistanceInput.value);
};
freehandDistanceInput.addEventListener('input', onFreehandDistanceChanged);
onFreehandDistanceChanged();

const resetOnEnterCheckBox = document.querySelector('.resetOnEnter');
const onResetChanged = () => {
  widgetRepresentation.setResetAfterEnter(resetOnEnterCheckBox.checked);
};
resetOnEnterCheckBox.addEventListener('click', onResetChanged);
onResetChanged();

const placeWidgetButton = document.querySelector('.placeWidget');
placeWidgetButton.addEventListener('click', () => {
  widgetRepresentation.reset();
  widgetManager.grabFocus(widget);
  placeWidgetButton.blur();
});
