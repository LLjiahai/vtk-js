import macro from 'vtk.js/Sources/macro';
import { vec3 } from 'gl-matrix';

export default function widgetBehavior(publicAPI, model) {
  model.classHierarchy.push('vtkSplineWidgetProp');

  // --------------------------------------------------------------------------
  // Private methods
  // --------------------------------------------------------------------------

  const updateHandlesSize = () => {
    if (model.handleSizeInPixels !== null) {
      const scale =
        model.handleSizeInPixels *
        vec3.distance(
          model.openGLRenderWindow.displayToWorld(0, 0, 0, model.renderer),
          model.openGLRenderWindow.displayToWorld(1, 0, 0, model.renderer)
        );

      model.moveHandle.setScale1(scale);
      model.widgetState.getHandleList().forEach((handle) => {
        handle.setScale1(scale);
      });
    }
  };

  // --------------------------------------------------------------------------

  const addPoint = () => {
    // Commit handle to location
    if (
      !model.lastHandle ||
      !model.freeHand ||
      vec3.squaredDistance(
        model.moveHandle.getOrigin(),
        model.lastHandle.getOrigin()
      ) >
        model.freehandMinDistance * model.freehandMinDistance
    ) {
      model.lastHandle = model.widgetState.addHandle();
      model.lastHandle.setOrigin(...model.moveHandle.getOrigin());
      model.lastHandle.setColor(model.moveHandle.getColor());
      model.lastHandle.setScale1(model.moveHandle.getScale1());

      if (!model.firstHandle) {
        model.firstHandle = model.lastHandle;
        publicAPI.invokeStartInteractionEvent();
      }

      model.openGLRenderWindow.setCursor('grabbing');
    }
  };

  // --------------------------------------------------------------------------

  const getHoveredHandle = () => {
    const handles = model.widgetState.getHandleList();

    return handles.reduce(
      ({ closestHandle, closestDistance }, handle) => {
        const distance = vec3.squaredDistance(
          model.moveHandle.getOrigin(),
          handle.getOrigin()
        );
        if (handle !== model.moveHandle) {
          return {
            closestHandle: distance < closestDistance ? handle : closestHandle,
            closestDistance:
              distance < closestDistance ? distance : closestDistance,
          };
        }

        return {
          closestHandle,
          closestDistance,
        };
      },
      {
        closestHandle: null,
        closestDistance:
          model.moveHandle.getScale1() * model.moveHandle.getScale1(),
      }
    ).closestHandle;
  };

  // --------------------------------------------------------------------------
  // Display 2D
  // --------------------------------------------------------------------------

  publicAPI.setDisplayCallback = (callback) =>
    model.representations[0].setDisplayCallback(callback);

  // --------------------------------------------------------------------------
  // Public methods
  // --------------------------------------------------------------------------

  macro.setGet(publicAPI, model, [
    'freehandMinDistance',
    'allowFreehand',
    'resetAfterEnter',
    'resolution',
    'defaultCursor',
    'handleSizeInPixels',
  ]);

  // --------------------------------------------------------------------------

  const superSetHandleSizeInPixels = publicAPI.setHandleSizeInPixels;
  publicAPI.setHandleSizeInPixels = (size) => {
    superSetHandleSizeInPixels(size);
    updateHandlesSize();
  };
  publicAPI.setHandleSizeInPixels(model.handleSizeInPixels); // set initial value

  // --------------------------------------------------------------------------

  const superSetResolution = publicAPI.setResolution;
  publicAPI.setResolution = (resolution) => {
    superSetResolution(resolution);
    model.representations[1].setResolution(model.resolution);
  };
  publicAPI.setResolution(model.resolution); // set initial value

  // --------------------------------------------------------------------------

  publicAPI.getPoints = () =>
    model.representations[1]
      .getOutputData()
      .getPoints()
      .getData();

  // --------------------------------------------------------------------------

  publicAPI.reset = () => {
    model.widgetState.clearHandleList();

    model.lastHandle = null;
    model.firstHandle = null;
  };

  // --------------------------------------------------------------------------
  // Right click: Delete handle
  // --------------------------------------------------------------------------

  publicAPI.handleRightButtonPress = (e) => {
    if (
      !model.activeState ||
      !model.activeState.getActive() ||
      !model.pickable
    ) {
      return macro.VOID;
    }

    if (model.activeState !== model.moveHandle) {
      model.interactor.requestAnimation(publicAPI);
      model.activeState.deactivate();
      model.widgetState.removeHandle(model.activeState);
      model.activeState = null;
      model.interactor.cancelAnimation(publicAPI);
    } else {
      const handle = getHoveredHandle();
      if (handle) {
        model.widgetState.removeHandle(handle);
      } else if (model.lastHandle) {
        model.widgetState.removeHandle(model.lastHandle);
        const handles = model.widgetState.getHandleList();
        model.lastHandle = handles[handles.length - 1];
      }
    }

    publicAPI.invokeInteractionEvent();

    return macro.EVENT_ABORT;
  };

  // --------------------------------------------------------------------------
  // Left press: Add new point
  // --------------------------------------------------------------------------

  publicAPI.handleLeftButtonPress = (e) => {
    if (
      !model.activeState ||
      !model.activeState.getActive() ||
      !model.pickable
    ) {
      return macro.VOID;
    }

    // If in placing mode ... (hasFocus)
    if (model.activeState === model.moveHandle) {
      // ... check if above an existing handle.
      const hoveredHandle = getHoveredHandle();
      if (hoveredHandle) {
        if (hoveredHandle === model.firstHandle) {
          // If initial handle, end spline
          publicAPI.loseFocus();
        } else {
          // If other handle, deactivate placing ...
          model.moveHandle.deactivate();
          model.moveHandle.setVisible(false);
          // ... and activate dragging it
          model.activeState = hoveredHandle;
          hoveredHandle.activate();
          model.isDragging = true;
        }
      } else {
        // If no handle hovered, add a new point
        addPoint();
      }

      model.freeHand = model.allowFreehand && !model.isDragging;
    } else {
      // If not in placing mode, active state is an hovered handle
      model.isDragging = true;
      model.openGLRenderWindow.setCursor('grabbing');
      model.interactor.requestAnimation(publicAPI);
    }

    return macro.EVENT_ABORT;
  };

  // --------------------------------------------------------------------------
  // Left release
  // --------------------------------------------------------------------------

  publicAPI.handleLeftButtonRelease = (e) => {
    if (model.isDragging) {
      if (!model.hasFocus) {
        model.openGLRenderWindow.setCursor(model.defaultCursor);
        model.widgetState.deactivate();
        model.interactor.cancelAnimation(publicAPI);
      } else {
        model.moveHandle.setOrigin(...model.activeState.getOrigin());
        model.activeState.deactivate();
        model.moveHandle.activate();
        model.activeState = model.moveHandle;

        if (!model.draggedPoint) {
          if (
            vec3.squaredDistance(
              model.moveHandle.getOrigin(),
              model.lastHandle.getOrigin()
            ) <
              model.moveHandle.getScale1() * model.moveHandle.getScale1() ||
            vec3.squaredDistance(
              model.moveHandle.getOrigin(),
              model.firstHandle.getOrigin()
            ) <
              model.moveHandle.getScale1() * model.moveHandle.getScale1()
          ) {
            model.lastHandle.setVisible(true);
            publicAPI.invokeEndInteractionEvent();
          }
        }

        model.interactor.render();
      }
    } else if (model.activeState !== model.moveHandle) {
      model.widgetState.deactivate();
    }

    if (
      (model.hasFocus && !model.activeState) ||
      (model.activeState && !model.activeState.getActive())
    ) {
      model.widgetManager.enablePicking();
      model.interactor.render();
    }

    model.freeHand = false;
    model.isDragging = false;
    model.draggedPoint = false;

    return model.hasFocus ? macro.EVENT_ABORT : macro.VOID;
  };

  // --------------------------------------------------------------------------
  // Mouse move: Drag selected handle / Handle follow the mouse
  // --------------------------------------------------------------------------

  publicAPI.handleMouseMove = (callData) => {
    if (
      !model.activeState ||
      !model.activeState.getActive() ||
      !model.pickable ||
      !model.manipulator
    ) {
      return macro.VOID;
    }

    model.manipulator.setOrigin(model.activeState.getOrigin());
    model.manipulator.setNormal(model.camera.getDirectionOfProjection());
    const worldCoords = model.manipulator.handleEvent(
      callData,
      model.openGLRenderWindow
    );

    const hoveredHandle = getHoveredHandle();
    if (hoveredHandle) {
      model.moveHandle.setVisible(false);
      if (hoveredHandle !== model.firstHandle) {
        model.openGLRenderWindow.setCursor('grabbing');
      }
    } else if (!model.isDragging && model.hasFocus) {
      model.moveHandle.setVisible(true);
      model.openGLRenderWindow.setCursor(model.defaultCursor);
    }

    if (model.lastHandle) {
      model.lastHandle.setVisible(true);
    }

    if (model.isDragging || model.activeState === model.moveHandle) {
      model.activeState.setOrigin(worldCoords);
      if (model.isDragging) {
        model.draggedPoint = true;
      }
      if (model.freeHand && model.activeState === model.moveHandle) {
        addPoint();
      }
    }

    return model.hasFocus ? macro.EVENT_ABORT : macro.VOID;
  };

  // --------------------------------------------------------------------------
  // Mofifier keys
  // --------------------------------------------------------------------------

  publicAPI.handleKeyDown = ({ key }) => {
    model.keysDown[key] = true;

    if (!model.hasFocus) {
      return;
    }

    if (key === 'Enter') {
      if (model.widgetState.getHandleList().length > 0) {
        if (model.resetAfterEnter) {
          publicAPI.reset();
        }
        publicAPI.loseFocus();
      }
    } else if (key === 'Escape') {
      publicAPI.reset();
      publicAPI.loseFocus();
    } else if (key === 'Delete' || key === 'Backspace') {
      if (model.lastHandle) {
        model.widgetState.removeHandle(model.lastHandle);

        const handleList = model.widgetState.getHandleList();
        model.lastHandle = handleList[handleList.length - 1];
      }
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.handleKeyUp = ({ key }) => {
    model.keysDown[key] = false;
  };

  // --------------------------------------------------------------------------
  // Focus API - modeHandle follow mouse when widget has focus
  // --------------------------------------------------------------------------

  publicAPI.grabFocus = () => {
    if (!model.hasFocus) {
      model.activeState = model.moveHandle;
      model.activeState.activate();
      model.activeState.setVisible(true);
      model.interactor.requestAnimation(publicAPI);
      publicAPI.invokeStartInteractionEvent();
      updateHandlesSize();
    }

    model.hasFocus = true;
  };

  // --------------------------------------------------------------------------

  publicAPI.loseFocus = () => {
    if (model.hasFocus) {
      model.interactor.cancelAnimation(publicAPI);
      publicAPI.invokeEndInteractionEvent();
    }

    model.widgetState.deactivate();
    model.moveHandle.deactivate();
    model.moveHandle.setVisible(false);
    model.activeState = null;
    model.interactor.render();
    model.widgetManager.enablePicking();

    model.hasFocus = false;
  };
}
